import { Injectable, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  // Environment variables
  private merchantId = process.env.PHONEPE_MERCHANT_ID; // e.g., PGTESTPAYUAT
  private saltKey = process.env.PHONEPE_SALT_KEY;
  private saltIndex = process.env.PHONEPE_SALT_INDEX;
  private phonePeHostUrl = process.env.PHONEPE_HOST_URL;
  private callbackUrl = `${process.env.API_BASE_URL}/orders/callback`;

  constructor(
    // Inject your Database Repository here (e.g., @InjectRepository(Order) private orderRepo)
  ) { }

  // 1. Initiate Payment
  async getPhonePeSdkParams(amount: number, userId: string, mobileNumber: string) {
    const transactionId = `TXN_${uuidv4()}`;
    
    const payload = {
      merchantId: this.merchantId,
      merchantTransactionId: transactionId,
      merchantUserId: `USER_${userId}`,
      amount: amount * 100, // Amount in paise
      callbackUrl: this.callbackUrl,
      mobileNumber: mobileNumber,
      paymentInstrument: {
        type: "PAY_PAGE" // SDK handles the UI
      }
    };

    // 1. Encode Payload to Base64
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

    // 2. Generate Checksum (Base64 + Endpoint + Salt)
    // SDK Endpoint is usually "/pg/v1/pay"
    const apiEndPoint = "/pg/v1/pay";
    const stringToHash = base64Payload + apiEndPoint + this.saltKey;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const checksum = `${sha256}###${this.saltIndex}`;

    return {
      base64Payload: base64Payload,
      checksum: checksum,
      merchantTransactionId: transactionId,
      apiEndPoint: apiEndPoint,
      packageName: process.env.APP_PACKAGE_NAME,
      callbackUrl: this.callbackUrl// Required for Android context
    };
  }

  // 2. Check Payment Status (Manual Verification)
  async checkPaymentStatus(merchantTransactionId: string): Promise<{ success: boolean; status: string }> {
    const stringToHash = `/pg/v1/status/${this.merchantId}/${merchantTransactionId}` + this.saltKey;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const xVerify = `${sha256}###${this.saltIndex}`;

    try {
      const response = await axios.get(
        `${this.phonePeHostUrl}/pg/v1/status/${this.merchantId}/${merchantTransactionId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': xVerify,
            'X-MERCHANT-ID': this.merchantId,
          },
        }
      );

      const status = response.data.code;

      // Update DB based on status
      // if (status === 'PAYMENT_SUCCESS') { await this.markOrderAsPaid(merchantTransactionId); }

      return {
        success: status === 'PAYMENT_SUCCESS',
        status: status
      };
    } catch (error) {
      this.logger.error(`Status Check Error: ${error.message}`);
      return { success: false, status: 'FAILED' };
    }
  }
}