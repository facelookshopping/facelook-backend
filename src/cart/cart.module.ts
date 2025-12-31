import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './cart.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { ProductsModule } from '../products/products.module'; // 👈 IMPORT THIS

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart]), 
    ProductsModule // 👈 Allows us to inject ProductsService
  ],
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService]
})
export class CartModule {}