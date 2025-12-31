import { Injectable } from '@nestjs/common';
import { twilioConfig } from 'src/config';
import { Twilio } from 'twilio';

@Injectable()
export class OtpService {
  private twilioClient: Twilio;
  private otpStore = new Map<string, string>();

  constructor() {
    this.twilioClient = new Twilio(twilioConfig.accountSid, twilioConfig.authToken);
  }

  async sendOtp(phoneNumber: string): Promise<void> {
    const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
    this.otpStore.set(phoneNumber, otp);
    setTimeout(() => this.otpStore.delete(phoneNumber), 5 * 60 * 1000);

    await this.twilioClient.messages.create({
      body: `Your OTP code is ${otp}`,
      to: phoneNumber,
      from: twilioConfig.phoneNumber,
    });
    console.log(`Sent OTP ${otp} to ${phoneNumber}`);
  }

  verifyOtp(phoneNumber: string, otp: string): boolean {
    const savedOtp = this.otpStore.get(phoneNumber);
    return savedOtp === otp;
  }
}
