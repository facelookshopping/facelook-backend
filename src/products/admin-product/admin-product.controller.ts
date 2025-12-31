import { Controller, Post, Body, Param, Patch, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Product } from '../product.entity';
import { ProductsService } from '../products.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/users/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  create(@Body() productData: Partial<Product>) {
    return this.productsService.create(productData);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<Product>,
  ) {
    return this.productsService.update(id, updateData);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  delete(@Param('id', ParseIntPipe) id: number) {
    // return this.productsService.delete(id);
    return this.productsService.update(id, { isArchived: true });
  }
}