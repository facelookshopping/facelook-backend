import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
// ✅ IMPORT THE ENUM
import { UserRole } from 'src/users/user.entity';

@Injectable()
export class AdminAuthService {
    constructor(private usersService: UsersService) { }

    async validateUser(email: string, password: string) {
        const user = await this.usersService.findOneByEmail(email);
        if (
            user &&
            user.password &&
            (user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN)
        ) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                return user;
            }
        }
        return null;
    }
}