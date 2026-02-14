import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from '@adminjs/nestjs';
import AdminJS from 'adminjs';
import * as bcrypt from 'bcrypt'; // ✅ Required for password checking

// --- Feature Modules ---
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { FavoritesModule } from './favorites/favorites.module';
import { AddressesModule } from './addresses/addresses.module';
import { BannersModule } from './banners/banners.module';
import { PaymentsModule } from './payments/payments.module';
import { OrdersModule } from './orders/orders.module';
import { TryOnModule } from './try-on/try-on.module';
import { ConfigModule } from '@nestjs/config';

// --- Entity Imports (For AdminJS) ---
import { User } from './users/user.entity';
import { Address } from './addresses/address.entity';
import { Product } from './products/product.entity';
import { ProductVariant } from './products/entities/product-variant.entity';
import { Banner } from './banners/banner.entity';
import { Order } from './orders/order.entity';
import { OrderItem } from './orders/order-item.entity';
import { Cart } from './cart/cart.entity';
import { Favorite } from './favorites/favorite.entity';

// --- Services (For Auth) ---
import { UsersService } from './users/users.service';
import { AdminPanelModule } from './admin/admin.module';

// -----------------------------------------------------------------------
// ✅ ADAPTER SETUP
// -----------------------------------------------------------------------
const AdminJSTypeorm = require('@adminjs/typeorm');
const Database = AdminJSTypeorm.default?.Database || AdminJSTypeorm.Database;
const Resource = AdminJSTypeorm.default?.Resource || AdminJSTypeorm.Resource;

AdminJS.registerAdapter({ Database, Resource });
// -----------------------------------------------------------------------

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432') || 5432,
      username: process.env.DATABASE_USER || 'shopping_user',
      password: process.env.DATABASE_PASSWORD || 'shopping_pass',
      database: process.env.DATABASE_NAME || 'shopping_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),

    // Feature Modules
    UsersModule, AuthModule, ProductsModule, CartModule,
    FavoritesModule, AddressesModule, BannersModule,
    OrdersModule, PaymentsModule, TryOnModule,

    // ✅ ADMINJS CONFIGURATION (ASYNC)
    AdminPanelModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }