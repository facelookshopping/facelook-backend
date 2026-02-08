import {
    Controller,
    Post,
    Get,
    Delete, // ✅ Import this
    Param,  // ✅ Import this
    ParseIntPipe, // ✅ Import this
    Body,
    UseInterceptors,
    UploadedFiles,
    BadRequestException,
    UseGuards,
    Req,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { TryOnService } from './try-on.service';
import { GenerateTryOnDto } from './dto/generate-try-on.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from 'src/types/express';

@ApiTags('Try On')
@Controller('try-on')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TryOnController {
    constructor(private readonly tryOnService: TryOnService) { }

    // --- 1. UPLOAD MULTIPLE IMAGES ---
    @Post('upload-images')
    @UseInterceptors(FilesInterceptor('files', 5, {
        storage: diskStorage({
            destination: './uploads/try-on',
            filename: (req, file, callback) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                const ext = extname(file.originalname);
                callback(null, `user-ref-${uniqueSuffix}${ext}`);
            },
        }),
        fileFilter: (req, file, callback) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
                return callback(new BadRequestException('Only image files are allowed!'), false);
            }
            callback(null, true);
        },
    }))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
            },
        },
    })
    async uploadUserImages(
        @UploadedFiles() files: Array<Express.Multer.File>,
        @Req() req: AuthenticatedRequest
    ) {
        if (!files || files.length === 0) throw new BadRequestException('No files uploaded');

        const fileUrls = files.map(file => `/uploads/try-on/${file.filename}`);

        return this.tryOnService.saveUserUploads(req.user, fileUrls);
    }

    // --- 2. GENERATE TRY-ON ---
    @Post('generate')
    async generateTryOn(@Body() dto: GenerateTryOnDto, @Req() req: AuthenticatedRequest) {
        const baseUrl = process.env.API_BASE_URL || 'http://YOUR_PUBLIC_IP:3000';

        dto.userImageUrls = dto.userImageUrls.map(url =>
            url.startsWith('/') ? `${baseUrl}${url}` : url
        );

        return this.tryOnService.generateTryOn(req.user, dto);
    }

    // --- 3. GETTERS ---
    @Get('uploads')
    async getUserUploads(@Req() req: AuthenticatedRequest) {
        return this.tryOnService.getUserUploads(req.user.id);
    }

    @Get('history')
    async getHistory(@Req() req: AuthenticatedRequest) {
        return this.tryOnService.getGeneratedHistory(req.user.id);
    }

    // --- 4. DELETE APIs (New) ---

    // Delete a User Uploaded Reference (by ID)
    @Delete('uploads/:id')
    async deleteUpload(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ) {
        return this.tryOnService.deleteUpload(id, req.user.id);
    }

    // Delete a Generated Try-On Result (by ID)
    @Delete('history/:id')
    async deleteGenerated(
        @Param('id', ParseIntPipe) id: number,
        @Req() req: AuthenticatedRequest
    ) {
        return this.tryOnService.deleteGenerated(id, req.user.id);
    }
}