import { forwardRef, Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { OtpService } from 'src/otp/otp.service';
import { AuthModule } from 'src/auth/auth.module';
import { AdminUsersController } from './users-admin.controller'; // Ensure this file exists

@Module({
    imports: [TypeOrmModule.forFeature([User]), forwardRef(() => AuthModule)],
    controllers: [
      UsersController,       
      AdminUsersController  
    ], 
    providers: [UsersService, OtpService],
    exports: [UsersService],
})
export class UsersModule { }