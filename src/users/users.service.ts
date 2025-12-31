import { Injectable, NotFoundException, BadRequestException, ConflictException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcrypt';
import { CreateStaffDto } from './dto/create-staff.dto';

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

  // --- APP / PUBLIC METHODS ---

  async createWithPhone(phoneNumber: string): Promise<User> {
    const existing = await this.usersRepository.findOne({ where: { phoneNumber } });
    if (existing) throw new BadRequestException('Phone number already registered');

    const user = this.usersRepository.create({
      phoneNumber,
      isVerified: false,
      role: UserRole.USER
    });
    
    const savedUser = await this.usersRepository.save(user);
    // ✅ Manually attach empty address list for Frontend safety
    savedUser.addresses = [];
    return savedUser;
  }

  async createWithEmail(email: string, password: string, phoneNumber: string, userName: string): Promise<User> {
    const existingByEmail = await this.usersRepository.findOne({ where: { email } });
    if (existingByEmail) throw new ConflictException('Email already registered');

    const existingByPhone = await this.usersRepository.findOne({ where: { phoneNumber } });
    if (existingByPhone) throw new ConflictException('Phone number already registered');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      phoneNumber,
      email,
      password: hashedPassword,
      name: userName,
      isVerified: false,
      role: UserRole.USER, // Force USER role
    });
    
    const savedUser = await this.usersRepository.save(user);
    // ✅ Manually attach empty address list so Frontend doesn't crash on null
    savedUser.addresses = [];
    return savedUser;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User> {
    const user = await this.usersRepository.findOne({ 
      where: { phoneNumber },
      relations: ['addresses'] // ✅ Load addresses
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ 
      where: { id },
      relations: ['addresses'] // ✅ Load addresses so Profile screen works immediately
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ 
      where: { email },
      relations: ['addresses'] // ✅ Load addresses on Login
    });
    
    if (user && user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) return user;
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
    // Note: We don't load addresses list for Admin view to save performance
    if (role) {
      return this.usersRepository.find({ where: { role } });
    }
    return this.usersRepository.find();
  }

  async delete(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }
}