import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);

  // Environment variables with fallbacks or strict checks
  private merchantId = process.env.PHONEPE_MERCHANT_ID;
  private saltKey = process.env.PHONEPE_SALT_KEY;
  private saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
  private phonePeHostUrl = process.env.PHONEPE_HOST_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox'; // Default to Sandbox if missing
  
  // CRITICAL: This MUST match your Hostinger Domain (https://api.facelookshopping.in)
  private apiBaseUrl = process.env.APP_URL; 

  constructor() {}

  // Edge Case Check: Ensure Env Vars are present on startup
  onModuleInit() {
    if (!this.apiBaseUrl) {
      this.logger.error('CRITICAL: APP_URL is not defined in .env! Payments will fail.');
    }
    if (!this.saltKey) {
      this.logger.error('CRITICAL: PHONEPE_SALT_KEY is missing!');
    }
  }

  // 1. Initiate Payment
  async getPhonePeSdkParams(amount: number, userId: string, mobileNumber: string) {
    const merchantTransactionId = `MT${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Construct Callback URL dynamically using the Real Domain
    const callbackUrl = `${this.apiBaseUrl}/payments/callback`;

    const payload = {
      merchantId: this.merchantId,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: `USER_${userId}`,
      amount: amount * 100, // Amount in paise
      callbackUrl: callbackUrl,
      mobileNumber: mobileNumber,
      paymentInstrument: {
        type: "PAY_PAGE"
      }
    };

    // 1. Encode Payload to Base64
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

    // 2. Generate Checksum
    const apiEndPoint = "/pg/v1/pay";
    const stringToHash = base64Payload + apiEndPoint + this.saltKey;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const checksum = `${sha256}###${this.saltIndex}`;

    return {
      base64Payload: base64Payload,
      checksum: checksum,
      merchantTransactionId: merchantTransactionId,
      apiEndPoint: apiEndPoint,
      packageName: process.env.APP_PACKAGE_NAME || 'com.facelook.shopping', // Fallback if missing
      callbackUrl: callbackUrl 
    };
  }

  // 2. Check Payment Status
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