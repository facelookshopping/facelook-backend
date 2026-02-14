import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module'; // Adjust path if needed
import { AdminAuthService } from './admin-auth.service';

@Module({
    imports: [UsersModule], // Import UsersModule because AdminAuthService needs it
    providers: [AdminAuthService],
    exports: [AdminAuthService], // 👈 CRITICAL: Export it so AdminModule can use it
})
export class AdminAuthModule { }