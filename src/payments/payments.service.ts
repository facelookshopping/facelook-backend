import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  private merchantId = process.env.PHONEPE_MERCHANT_ID;
  private saltKey = process.env.PHONEPE_SALT_KEY;
  private saltIndex = process.env.PHONEPE_SALT_INDEX; // Usually 1
  private phonePeHostUrl = process.env.PHONEPE_HOST_URL; // https://api-preprod.phonepe.com/apis/pg-sandbox (Test) or https://api.phonepe.com/apis/hermes (Prod)
  private callbackUrl = `${process.env.API_BASE_URL}/orders/callback`; // Your deployed backend URL

  // 1. Initiate Payment
  async initiatePhonePePayment(amount: number, orderId: string, userId: string, mobileNumber: string) {
    const transactionId = `TXN_${uuidv4()}`;
    
    // Construct Payload
    const payload = {
      merchantId: this.merchantId,
      merchantTransactionId: transactionId,
      merchantUserId: `USER_${userId}`,
      amount: amount * 100, // Amount in paise
      redirectUrl: this.callbackUrl,
      redirectMode: "POST",
      callbackUrl: this.callbackUrl,
      mobileNumber: mobileNumber,
      paymentInstrument: {
        type: "PAY_PAGE" // Opens PhonePe's checkout page
      }
    };

    // Encode Payload (Base64)
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

    // Generate Checksum (X-VERIFY header)
    // Formula: SHA256(base64Payload + "/pg/v1/pay" + saltKey) + ### + saltIndex
    const stringToHash = base64Payload + '/pg/v1/pay' + this.saltKey;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    const xVerify = `${sha256}###${this.saltIndex}`;

    try {
      const response = await axios.post(
        `${this.phonePeHostUrl}/pg/v1/pay`,
        { request: base64Payload },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': xVerify,
          },
        }
      );

      // Return the URL for Flutter to open in WebView or Browser
      return {
        paymentUrl: response.data.data.instrumentResponse.redirectInfo.url,
        merchantTransactionId: transactionId
      };
    } catch (error) {
      throw new InternalServerErrorException(`PhonePe Init Error: ${error.message}`);
    }
  }

  // 2. Check Payment Status (Server-to-Server Check)
  // Essential because user might close app before callback hits
  async checkPaymentStatus(merchantTransactionId: string): Promise<boolean> {
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

      return response.data.code === 'PAYMENT_SUCCESS';
    } catch (error) {
      return false; // Treat error as pending/failed
    }
  }
}