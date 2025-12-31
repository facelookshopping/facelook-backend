import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  BadRequestException,
  ClassSerializerInterceptor,
  UseInterceptors,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { OtpService } from 'src/otp/otp.service';
import { JwtService } from '@nestjs/jwt';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { instanceToPlain } from 'class-transformer';
import type { AuthenticatedRequest } from 'src/types/express'; // Ensure you have this type
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
  ) { }

  // --- PUBLIC ROUTES ---

  @Post('request-otp')
  async requestOtp(@Body('phoneNumber') phoneNumber: string) {
    await this.otpService.sendOtp(phoneNumber);
    return { message: 'OTP sent successfully' };
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: { phoneNumber: string; otp: string }) {
    const isValid = this.otpService.verifyOtp(body.phoneNumber, body.otp);
    if (!isValid) throw new BadRequestException('Invalid OTP');

    let user = await this.usersService.findByPhoneNumber(body.phoneNumber).catch(() => null);
    if (!user) {
      user = await this.usersService.createWithPhone(body.phoneNumber);
    }
    await this.usersService.update(user.id, { isVerified: true });
    
    return this.generateAuthResponse(user);
  }

  @Post('register')
  async registerEmail(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('phoneNumber') phoneNumber: string,
    @Body('userName') userName: string,
  ) {
    const user = await this.usersService.createWithEmail(email, password, phoneNumber, userName);
    return this.generateAuthResponse(user);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login using email and password' })
  @ApiBody({ type: LoginDto })
  async loginEmail(@Body() loginDto: LoginDto) {
    const user = await this.usersService.validateUser(loginDto.email, loginDto.password);
    if (!user) throw new BadRequestException('Invalid email or password');
    return this.generateAuthResponse(user);
  }

  // --- PRIVATE / PROFILE ROUTES (Secured) ---

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: AuthenticatedRequest): Promise<User> {
    return this.usersService.findById(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @Req() req: AuthenticatedRequest, 
    @Body() updateData: Partial<User>
  ): Promise<User> {
    return this.usersService.update(req.user.id, updateData);
  }

  private generateAuthResponse(user: User) {
    const userWithoutPassword = instanceToPlain(user);
    const payload = { sub: user.id, phoneNumber: user.phoneNumber, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);
    return { user: userWithoutPassword, token };
  }
}