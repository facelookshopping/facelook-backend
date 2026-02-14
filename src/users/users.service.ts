import { Injectable, NotFoundException, BadRequestException, ConflictException, OnModuleInit, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcrypt';
import { CreateStaffDto } from './dto/create-staff.dto';
import * as admin from 'firebase-admin';
import path from 'path';
import * as fs from 'fs';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async onModuleInit() {
    await this.seedSuperAdmin();
  }

  async seedSuperAdmin() {
    const superEmail = 'superadmin@gmail.com';
    const superPassword = '123456';

    const user = await this.usersRepository.findOne({ where: { email: superEmail } });

    if (!user) {
      const hashedPassword = await bcrypt.hash(superPassword, 10);

      const superAdmin = this.usersRepository.create({
        email: superEmail,
        password: hashedPassword,
        name: 'Super Admin',
        phoneNumber: '+919876543210',
        role: UserRole.SUPERADMIN,
        isVerified: true,
      });

      await this.usersRepository.save(superAdmin);
      this.logger.log(`🚀 Super Admin created! Login with: ${superEmail}`);
    }
  }

  async loginWithFirebase(firebaseToken: string, fcmToken?: string): Promise<User> {
    this.logger.log(`Login with Firebase Token: ${firebaseToken}`);
    try {
      const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
      const phoneNumber = decodedToken.phone_number;

      if (!phoneNumber) {
        throw new BadRequestException('Invalid Firebase Token: No Phone Number');
      }

      let user = await this.usersRepository.findOne({
        where: { phoneNumber },
        relations: ['addresses']
      });

      // Auto-register if user doesn't exist
      if (!user) {
        user = this.usersRepository.create({
          phoneNumber,
          isVerified: true, // Phone verified by Firebase
          fcmToken: fcmToken,
          role: UserRole.USER,
          addresses: []
        });
        await this.usersRepository.save(user);
      } else {
        // Update existing user token
        if (fcmToken) {
          user.fcmToken = fcmToken;
        }
      }

      if (fcmToken) {
        await this.sendLoginNotification(fcmToken, user.name || 'User');
      }

      return user;
    } catch (error) {
      this.logger.error(`Firebase Error: ${error.message}`);
      throw new UnauthorizedException('Invalid OTP Session');
    }
  }

  async sendLoginNotification(fcmToken: string, userName: string) {
    try {
      const message = {
        notification: {
          title: 'Welcome Back! 👋',
          body: `Hello ${userName}, you have successfully logged in.`,
        },
        token: fcmToken,
      };

      await admin.messaging().send(message);
      this.logger.log(`📲 Login Notification sent to ${userName}`);
    } catch (error) {
      this.logger.error(`Failed to send notification: ${error.message}`);
    }
  }

  async updatePassword(userId: number, newPassword: string): Promise<User> {
    const user = await this.findById(userId);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await this.usersRepository.save(user);

    return user;
  }

  // --- APP / PUBLIC METHODS ---

  async createWithPhone(phoneNumber: string): Promise<User> {
    // Ensure phoneNumber is not undefined
    if (!phoneNumber) throw new BadRequestException('Phone number is required');

    const existing = await this.usersRepository.findOne({ where: { phoneNumber } });
    if (existing) throw new BadRequestException('Phone number already registered');

    const user = this.usersRepository.create({
      phoneNumber,
      isVerified: false,
      role: UserRole.USER
    });

    const savedUser = await this.usersRepository.save(user);
    savedUser.addresses = [];
    return savedUser;
  }

  async createWithEmail(email: string, password: string, phoneNumber: string, userName: string): Promise<User> {
    // 1. Check Email
    const existingByEmail = await this.usersRepository.findOne({ where: { email } });
    if (existingByEmail) throw new ConflictException('Email already registered');

    // 2. Check Phone (Only check if phoneNumber is provided)
    if (phoneNumber) {
      const existingByPhone = await this.usersRepository.findOne({ where: { phoneNumber } });
      if (existingByPhone) throw new ConflictException('Phone number already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ FIX: Use 'undefined' instead of 'null'
    // This satisfies TypeScript 'DeepPartial<User>' which expects 'string | undefined'
    const user = this.usersRepository.create({
      phoneNumber: phoneNumber || undefined,
      email,
      password: hashedPassword,
      name: userName,
      isVerified: false,
      role: UserRole.USER,
    });

    const savedUser = await this.usersRepository.save(user);
    savedUser.addresses = [];
    return savedUser;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { phoneNumber },
      relations: ['addresses']
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['addresses']
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['addresses'] // Optional: Include relations if needed
    });
  }

  async validateUser(email: string, password: string, fcmToken?: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['addresses']
    });

    if (user && user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        if (fcmToken && user.role == 'user') {
          user.fcmToken = fcmToken;
          await this.usersRepository.save(user);
          await this.sendLoginNotification(fcmToken, user.name || 'User');
        }
        return user;
      }
    }
    return null;
  }

  async update(id: number, updateData: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, updateData);
    return this.findById(id);
  }

  // --- ADMIN / INTERNAL METHODS ---

  async createStaff(dto: CreateStaffDto): Promise<User> {
    const existing = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const newUser = this.usersRepository.create({
      ...dto,
      password: hashedPassword,
      isVerified: true,
    });

    return this.usersRepository.save(newUser);
  }

  async findAll(role?: UserRole): Promise<User[]> {
    if (role) {
      return this.usersRepository.find({ where: { role } });
    }
    return this.usersRepository.find();
  }

  async delete(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async updateProfilePicture(userId: number, photoUrl: string): Promise<User> {
    await this.usersRepository.update(userId, { profilePicture: photoUrl });
    return this.findById(userId);
  }

  async removeProfileImage(userId: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // 1. Delete the file from the 'uploads' folder if it exists
    if (user.profileImage) {
      try {
        // Adjust 'uploads' path if your folder structure is different
        // process.cwd() gets the root folder of your project
        const filePath = path.join(process.cwd(), 'uploads', user.profileImage);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath); // Delete file
        }
      } catch (err) {
        console.error('Error deleting profile image file:', err);
      }
    }

    // 2. Set database column to null
    user.profileImage = null; // ⚠️ Change 'profileImage' to match your Entity column name

    return this.usersRepository.save(user);
  }

  async setCurrentRefreshToken(refreshToken: string, userId: number) {
    const currentHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.update(userId, { currentHashedRefreshToken });
  }

  async getUserIfRefreshTokenMatches(refreshToken: string, userId: number) {
    const user = await this.findById(userId);

    if (!user.currentHashedRefreshToken) {
      return null;
    }

    const isRefreshTokenMatching = await bcrypt.compare(
      refreshToken,
      user.currentHashedRefreshToken,
    );

    if (isRefreshTokenMatching) {
      return user;
    }
    return null;
  }

  async removeRefreshToken(userId: number) {
    return this.usersRepository.update(userId, {
      currentHashedRefreshToken: null as any,
    });
  }

  async deleteMyAccount(userId: number, password: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'password', 'email']
    });

    if (!user) throw new NotFoundException('User not found');

    if (!user.password) {
      throw new BadRequestException('This account uses social login and has no password to verify.');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new BadRequestException('Incorrect password');
    }

    await this.usersRepository.delete(userId);
  }
}