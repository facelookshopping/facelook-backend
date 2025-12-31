import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Patch, // 👈 Import Patch
  Body, 
  Param, 
  UseGuards, 
  Query, 
  ForbiddenException, 
  Req, 
  ClassSerializerInterceptor, 
  UseInterceptors,
  ParseIntPipe // 👈 Import ParseIntPipe for safety
} from '@nestjs/common';
import { User, UserRole } from './user.entity';
import { UsersService } from './users.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('admin/users')
export class AdminUsersController {
    constructor(private readonly usersService: UsersService) { }

    // 1. Create Staff
    @Post('staff')
    @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
    createStaff(@Body() createStaffDto: CreateStaffDto, @Req() req) {
        // Security: Admin cannot create SuperAdmin
        if (req.user.role !== UserRole.SUPERADMIN && createStaffDto.role === UserRole.SUPERADMIN) {
            throw new ForbiddenException('Cannot create SuperAdmin');
        }
        return this.usersService.createStaff(createStaffDto);
    }

    // 2. Get All Users (CRM View)
    @Get()
    @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.SUPPORT)
    findAll(@Query('role') role?: UserRole) {
        return this.usersService.findAll(role);
    }

    // 3. Update User (Ban, Verify, Change Role) - ✅ THIS WAS MISSING
    @Patch(':id')
    @Roles(UserRole.SUPERADMIN) // Only SuperAdmin should edit other users' sensitive info
    async updateUser(
        @Param('id', ParseIntPipe) id: number, 
        @Body() updateData: Partial<User> // Or create a specific AdminUpdateUserDto
    ) {
        // You might want to prevent updating the password here directly
        delete updateData.password; 
        return this.usersService.update(id, updateData);
    }

    // 4. Helper: Specific Endpoint to Ban/Unban (Easier for Frontend)
    @Patch(':id/status')
    @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
    async toggleBanStatus(
        @Param('id', ParseIntPipe) id: number, 
        @Body('isVerified') isVerified: boolean
    ) {
        return this.usersService.update(id, { isVerified });
    }

    // 5. Delete User
    @Delete(':id')
    @Roles(UserRole.SUPERADMIN)
    deleteUser(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.delete(id);
    }
}