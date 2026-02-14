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
  UploadedFile,
  UnauthorizedException,
  Delete,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { diskStorage as multerDiskStorage } from 'multer';
import { DeleteAccountDto } from './dto/delete-account.dto';
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

  @Post('login-otp')
  async loginOtp(@Body() body: { firebaseToken: string; fcmToken?: string }) {
    if (!body.firebaseToken) throw new BadRequestException('Token required');

    const user = await this.usersService.loginWithFirebase(body.firebaseToken, body.fcmToken);
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
    const user = await this.usersService.validateUser(loginDto.email, loginDto.password, loginDto.fcmToken);
    if (!user) throw new BadRequestException('Invalid email or password');
    return this.generateAuthResponse(user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update-password')
  async updatePassword(
    @Req() req: AuthenticatedRequest,
    @Body() body: { password: string; confirmPassword: string }
  ) {
    if (body.password !== body.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    if (body.password.length < 6) {
      throw new BadRequestException('Password too short');
    }

    const updatedUser = await this.usersService.updatePassword(req.user.id, body.password);
    return this.generateAuthResponse(updatedUser);
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

  private async generateAuthResponse(user: User) {
    const payload = { sub: user.id, phoneNumber: user.phoneNumber, email: user.email, role: user.role };

    // 1. Access Token (Short-lived: 15 minutes)
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    // 2. Refresh Token (Long-lived: 7 days)
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // 3. Save Refresh Token hash to DB
    await this.usersService.setCurrentRefreshToken(refreshToken, user.id);

    const userWithoutPassword = instanceToPlain(user);

    // Return structure matching your Flutter model
    return {
      user: userWithoutPassword,
      token: accessToken, // Maps to 'token' in Flutter
      refreshToken: refreshToken // Maps to new field in Flutter
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: AuthenticatedRequest) {
    await this.usersService.removeRefreshToken(req.user.id);
    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    if (!body.refreshToken) throw new BadRequestException('Refresh token required');

    try {
      // 1. Verify the signature of the refresh token
      // Note: We use the same secret for simplicity, but in prod use a different secret
      const payload = this.jwtService.verify(body.refreshToken);

      // 2. Check if this token matches what's in the DB
      const user = await this.usersService.getUserIfRefreshTokenMatches(
        body.refreshToken,
        payload.sub,
      );

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // 3. Generate NEW tokens
      return this.generateAuthResponse(user);

    } catch (e) {
      throw new UnauthorizedException('Session expired');
    }
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  async deleteMe(@Req() req, @Body() dto: DeleteAccountDto) {
    // req.user.id comes from the JWT Strategy
    return this.usersService.deleteMyAccount(req.user.id, dto.password);
  }



  @UseGuards(JwtAuthGuard)
  @Post('upload-profile-pic')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    storage: multerDiskStorage({
      destination: './uploads/profiles', // Folder path
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `avatar-${uniqueSuffix}${ext}`);
      },
    }),
  }))
  async uploadProfilePic(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException('File is required');

    // Generate the full URL or relative path
    const filePath = `/uploads/profiles/${file.filename}`;

    const updatedUser = await this.usersService.updateProfilePicture(req.user.id, filePath);
    return this.generateAuthResponse(updatedUser);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('profile-image')
  async removeProfileImage(@Req() req) {
    return this.usersService.removeProfileImage(req.user.id);
  }
}

function diskStorage(arg0: {
  destination: string; // Folder path
  filename: (req: any, file: any, callback: any) => void;
}): any {
  throw new Error('Function not implemented.');
}
