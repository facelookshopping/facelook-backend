import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import type { AuthenticatedRequest } from 'src/types/express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/users/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('addresses')
export class AddressesController {
    constructor(private readonly addressesService: AddressesService) { }

    @Post()
    @Roles(UserRole.USER)
    create(@Req() req: AuthenticatedRequest, @Body() dto: CreateAddressDto) {
        return this.addressesService.create(req.user, dto);
    }

    @Get()
    @Roles(UserRole.USER)
    findAll(@Req() req: AuthenticatedRequest) {
        return this.addressesService.findAll(req.user.id);
    }

    @Patch(':id/default')
    setDefault(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.addressesService.setDefault(req.user.id, id);
    }

    @Delete(':id')
    delete(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.addressesService.delete(req.user.id, id);
    }
}