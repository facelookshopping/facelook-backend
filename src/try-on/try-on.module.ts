import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TryOnController } from './try-on.controller';
import { TryOnService } from './try-on.service';
import { TryOn } from './try-on.entity';
import { Product } from 'src/products/product.entity'; // ✅ Import

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([TryOn, Product]), // ✅ Add Product
  ],
  controllers: [TryOnController],
  providers: [TryOnService],
})
export class TryOnModule { }