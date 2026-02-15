import {
    Injectable,
    BadRequestException,
    Logger,
    NotFoundException,
    HttpException,
    HttpStatus
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { GenerateTryOnDto } from './dto/generate-try-on.dto';
import { TryOn } from './try-on.entity';
import { User } from 'src/users/user.entity';
import { Product } from 'src/products/product.entity';

@Injectable()
export class TryOnService {
    private readonly logger = new Logger(TryOnService.name);

    // ✅ Submission uses the full model path
    private readonly falModelId = 'fal-ai/fashn/tryon/v1.6';
    private readonly falQueueUrl = `https://queue.fal.run/${this.falModelId}`;

    // ✅ Polling uses the base alias as confirmed by your Postman test
    private readonly falPollingBaseUrl = 'https://queue.fal.run/fal-ai/fashn';

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        @InjectRepository(TryOn) private tryOnRepo: Repository<TryOn>,
        @InjectRepository(Product) private productRepo: Repository<Product>,
    ) { }

    private getPublicUrl(path: string): string {
        if (!path) return '';
        if (path.startsWith('http')) return path; // Already public

        // Get your URL from .env (Ensure this is spelled correctly in your .env file!)
        const baseUrl = this.configService.get<string>('APP_URL') || 'https://staging.facelookshopping.in';

        // Ensure the path starts with a slash
        let cleanPath = path.startsWith('/') ? path : `/${path}`;

        // ✅ FIX: Encode the path to handle spaces in filenames (e.g., "White Tee.jpg" -> "White%20Tee.jpg")
        // We split by '/' to encode each segment individually, avoiding encoding the '/' itself.
        cleanPath = cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/');

        // Revert the encoded slashes back to normal slashes
        cleanPath = cleanPath.replace(/%2F/g, '/');

        return `${baseUrl}${cleanPath}`;
    }

    // --- SAVE USER UPLOADS ---
    async saveUserUploads(user: User, fileUrls: string[]) {
        const newEntry = this.tryOnRepo.create({
            user,
            imageUrls: fileUrls,
            type: 'REFERENCE',
        });
        return this.tryOnRepo.save(newEntry);
    }

    // --- GENERATE TRY-ON ---
    async generateTryOn(user: User, dto: GenerateTryOnDto) {
        const falKey = this.configService.get<string>('FAL_KEY');
        if (!falKey) throw new BadRequestException('FAL_KEY missing');

        // 1. Check for active jobs (Stale job check)
        const activeJob = await this.tryOnRepo.findOne({
            where: { user: { id: user.id }, status: 'PROCESSING' }
        });

        if (activeJob) {
            const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
            if (activeJob.createdAt < threeMinutesAgo) {
                this.logger.warn(`Marking stale job ${activeJob.id} as FAILED`);
                await this.tryOnRepo.update(activeJob.id, { status: 'FAILED' });
            } else {
                throw new BadRequestException('A try-on is already in progress. Please wait.');
            }
        }

        // 2. Fetch Product
        let product: Product | null = null;
        if (dto.productId) {
            product = await this.productRepo.findOne({ where: { id: dto.productId } });
        }

        try {
            this.logger.log(`[SUBMIT] Starting Fashn v1.6 for User ${user.id}`);
            this.logger.log('user image', dto.userImageUrls[0]);
            this.logger.log('garment image', dto.garmentImageUrls[0]);
            const payload = {
                model_image: this.getPublicUrl(dto.userImageUrls[0]),
                garment_image: this.getPublicUrl(dto.garmentImageUrls[0]),
                category: dto.category,
                mode: "performance",
                moderation_level: "permissive",
                num_samples: 1,
            };

            const submitResponse = await firstValueFrom(
                this.httpService.post(this.falQueueUrl, payload, {
                    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' }
                })
            );

            const requestId = submitResponse.data.request_id;

            // ✅ Correct Polling URL based on your Postman test
            const pollingUrl = `${this.falPollingBaseUrl}/requests/${requestId}`;

            this.logger.log(`[SUBMIT] Job Accepted. ID: ${requestId}`);

            // 3. Create Record
            let tryOnRecord = this.tryOnRepo.create({
                user,
                type: 'GENERATED',
                status: 'PROCESSING',
                requestId: requestId,
                imageUrls: [],
                garmentUrls: dto.garmentImageUrls,
                category: dto.category,
                product: product as any
            });

            tryOnRecord = await this.tryOnRepo.save(tryOnRecord);

            // 4. Start Background Polling
            this.pollForCompletion(requestId, pollingUrl, tryOnRecord.id, falKey);

            return tryOnRecord;
        } catch (error) {
            this.handleFalError(error);
        }
    }

    // --- BACKGROUND POLLING SYSTEM ---
    private async pollForCompletion(requestId: string, pollingUrl: string, dbRecordId: number, falKey: string) {
        const maxAttempts = 60;
        let attempts = 0;

        this.logger.debug(`[POLL START] Monitoring Job: ${requestId} at ${pollingUrl}`);

        const interval = setInterval(async () => {
            attempts++;
            try {
                this.logger.verbose(`[POLL ATTEMPT ${attempts}/${maxAttempts}] GET ${pollingUrl}`);

                const check = await firstValueFrom(
                    this.httpService.get(pollingUrl, {
                        headers: { 'Authorization': `Key ${falKey}` }
                    })
                );

                const status = check.data.status;

                // Success case: Status is COMPLETED OR we have the images array directly (Fast finish)
                if (status === 'COMPLETED' || (!status && check.data.images)) {
                    clearInterval(interval);
                    this.logger.log(`[POLL SUCCESS] Job ${requestId} is ready.`);

                    const data = check.data.payload || check.data;
                    const resultImageUrl = data.images?.[0]?.url;

                    if (resultImageUrl) {
                        await this.tryOnRepo.update(dbRecordId, {
                            status: 'COMPLETED',
                            imageUrls: [resultImageUrl]
                        });
                        this.logger.log(`[DB UPDATE] Job ${requestId} saved with final image.`);
                    } else {
                        this.logger.error(`[POLL ERROR] Completed but no image URL found in payload.`);
                        await this.tryOnRepo.update(dbRecordId, { status: 'FAILED' });
                    }
                } else if (status === 'FAILED') {
                    this.logger.error(`[POLL FAILED] Fal.ai reported failure for request: ${requestId}`);
                    clearInterval(interval);
                    await this.tryOnRepo.update(dbRecordId, { status: 'FAILED' });
                }

                if (attempts >= maxAttempts) {
                    this.logger.warn(`[POLL TIMEOUT] Reached 2-minute limit for Job: ${requestId}`);
                    clearInterval(interval);
                    await this.tryOnRepo.update(dbRecordId, { status: 'TIMEOUT' });
                }
            } catch (e) {
                const status = e.response?.status;
                const errorData = e.response?.data;
                const errorMessage = errorData?.detail || e.message;

                // ✅ FIX: Check if 400 means "In Progress"
                if (status === 400 && errorMessage.toString().includes('in progress')) {
                    this.logger.verbose(`[POLL WAIT] Job ${requestId} is still processing (400 - In Progress)...`);
                    // Do NOT clearInterval here. Let it loop again in 2 seconds.
                    return;
                }

                this.logger.error(`[POLL EXCEPTION] Status: ${status} | Message: ${e.message}`);

                if (status === 405) {
                    this.logger.error(`[POLL FATAL] 405 Method Not Allowed. Stopping.`);
                    clearInterval(interval);
                    await this.tryOnRepo.update(dbRecordId, { status: 'FAILED' });
                } else if (status === 422 || status === 400) {
                    // This is a REAL error (like "Failed to detect body pose")
                    this.logger.error(`[POLL FATAL] Real Validation Error (${status}): ${JSON.stringify(errorData)}`);
                    clearInterval(interval);

                    let finalMsg = "Image processing failed";
                    if (Array.isArray(errorData?.detail)) {
                        finalMsg = errorData.detail[0]?.msg || finalMsg;
                    } else if (errorData?.detail) {
                        finalMsg = errorData.detail;
                    }

                    await this.tryOnRepo.update(dbRecordId, { status: 'FAILED' });
                } else if (status === 404) {
                    this.logger.warn(`Job ${requestId} not found in queue yet (404)...`);
                } else {
                    // For 401 or other weird network errors, stop to prevent infinite loops
                    clearInterval(interval);
                    await this.tryOnRepo.update(dbRecordId, { status: 'FAILED' });
                }
            }
        }, 2000); // Check every 2 seconds
    }

    // --- ERROR HANDLING HELPER ---
    private handleFalError(error: any) {
        const errorData = error.response?.data;
        const msg = errorData?.detail || error.message;

        this.logger.error(`[SUBMIT ERROR] Details: ${JSON.stringify(msg)}`);

        if (error.response?.status === 422 && Array.isArray(msg)) {
            throw new BadRequestException(`AI Validation Error: ${msg[0]?.msg || 'Invalid Input'}`);
        }

        if (msg.toString().includes('Exhausted balance')) {
            throw new HttpException('AI Service Quota Exceeded. Please contact support.', 503);
        }

        throw new BadRequestException(msg || 'Failed to submit Try-On request');
    }

    // --- GETTERS & HISTORY ---
    async getGeneratedHistory(userId: number) {
        return this.tryOnRepo.find({
            where: { user: { id: userId }, type: 'GENERATED' },
            relations: ['product'],
            order: { createdAt: 'DESC' }
        });
    }

    async getUserUploads(userId: number) {
        return this.tryOnRepo.find({
            where: { user: { id: userId }, type: 'REFERENCE' },
            order: { createdAt: 'DESC' }
        });
    }

    // --- DELETE METHODS ---
    async deleteUpload(id: number, userId: number) {
        const r = await this.tryOnRepo.findOne({ where: { id, user: { id: userId }, type: 'REFERENCE' } });
        if (!r) throw new NotFoundException('Image not found');
        await this.tryOnRepo.remove(r);
        return { success: true };
    }

    async deleteGenerated(id: number, userId: number) {
        const r = await this.tryOnRepo.findOne({ where: { id, user: { id: userId }, type: 'GENERATED' } });
        if (!r) throw new NotFoundException('Try-on record not found');
        await this.tryOnRepo.remove(r);
        return { success: true };
    }
}