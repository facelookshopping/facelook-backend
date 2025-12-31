import { 
  Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards 
} from '@nestjs/common';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UserRole } from 'src/users/user.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  // ✅ PUBLIC: App calls this to show the home screen slider
  @Get()
  findAllActive() {
    return this.bannersService.findAllActive();
  }

  // 🔒 ADMIN ONLY: Create Banner
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  create(@Body() dto: CreateBannerDto) {
    return this.bannersService.create(dto);
  }

  // 🔒 ADMIN ONLY: See hidden banners
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  findAllAdmin() {
    return this.bannersService.findAllAdmin();
  }

  // 🔒 ADMIN ONLY: Update (e.g., fix typo or hide banner)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Partial<CreateBannerDto>) {
    return this.bannersService.update(id, body);
  }

  // 🔒 ADMIN ONLY: Delete
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bannersService.remove(id);
  }
}