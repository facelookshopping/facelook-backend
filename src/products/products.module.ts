import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './product.entity';
import { AdminProductsController } from './admin-product/admin-product.controller';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductVariantSubscriber } from './subscribers/product-variant.subscriber';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant])],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService, ProductVariantSubscriber],
  exports: [ProductsService],
})
export class ProductsModule { }