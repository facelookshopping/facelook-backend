import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from '@adminjs/nestjs';
import AdminJS from 'adminjs';

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

// --- Entity Imports (For AdminJS) ---
import { User } from './users/user.entity';
import { Address } from './addresses/address.entity';
import { Product } from './products/product.entity';
import { ProductVariant } from './products/entities/product-variant.entity'; // Check your actual path
import { Banner } from './banners/banner.entity';
import { Order } from './orders/order.entity';
import { OrderItem } from './orders/order-item.entity';
import { Cart } from './cart/cart.entity';
import { Favorite } from './favorites/favorite.entity';
import { TryOnModule } from './try-on/try-on.module';
import { ConfigModule } from '@nestjs/config';
// import { Payment } from './payments/payment.entity'; // Uncomment if you have this file

// -----------------------------------------------------------------------
// ✅ ADAPTER SETUP (Robust Fix for NestJS)
// -----------------------------------------------------------------------
const AdminJSTypeorm = require('@adminjs/typeorm');
const Database = AdminJSTypeorm.default?.Database || AdminJSTypeorm.Database;
const Resource = AdminJSTypeorm.default?.Resource || AdminJSTypeorm.Resource;

AdminJS.registerAdapter({ Database, Resource });
// -----------------------------------------------------------------------

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost', // Use the Env Var!
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USER || 'shopping_user',
      password: process.env.DATABASE_PASSWORD || 'shopping_pass',
      database: process.env.DATABASE_NAME || 'shopping_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Be careful with this in production!
    }),
    // ✅ Load ALL entities here so TypeORM knows about them
    TypeOrmModule.forFeature([
      User, Address, Product, ProductVariant, Banner,
      Order, OrderItem, Cart, Favorite
    ]),

    // Feature Modules
    UsersModule, AuthModule, ProductsModule, CartModule,
    FavoritesModule, AddressesModule, BannersModule,
    OrdersModule, PaymentsModule, TryOnModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // ✅ ADMINJS CONFIGURATION
    AdminModule.createAdmin({
      adminJsOptions: {
        rootPath: '/admin',
        branding: {
          companyName: 'FaceLook Store',
          withMadeWithLove: false,
        },
        resources: [
          // --- GROUP: USER MANAGEMENT ---
          {
            resource: User,
            options: {
              navigation: { name: 'User Management', icon: 'Users' },
              listProperties: ['id', 'name', 'email', 'role', 'isVerified', 'createdAt'],
            },
          },
          {
            resource: Address,
            options: {
              navigation: { name: 'User Management', icon: 'MapPin' },
              listProperties: ['user', 'label', 'city', 'state', 'phoneNumber'],
            },
          },
          {
            resource: Favorite,
            options: {
              navigation: { name: 'User Management', icon: 'Heart' },
            },
          },

          // --- GROUP: CATALOG ---
          {
            resource: Product,
            options: {
              navigation: { name: 'Catalog', icon: 'Package' },
              listProperties: ['id', 'name', 'price', 'stock', 'category', 'gender', 'isTrending', 'images'],
            },
          },
          {
            resource: ProductVariant,
            options: {
              navigation: { name: 'Catalog', icon: 'Layers' },
              listProperties: ['product', 'sku', 'size', 'color', 'stock'],
            },
          },

          // --- GROUP: SALES & ORDERS ---
          {
            resource: Order,
            options: {
              navigation: { name: 'Sales', icon: 'ShoppingCart' },
              listProperties: ['orderNumber', 'user', 'totalAmount', 'status', 'paymentType', 'createdAt'],
              sort: { sortBy: 'createdAt', direction: 'desc' },
            },
          },
          {
            resource: OrderItem,
            options: {
              navigation: { name: 'Sales', icon: 'List' },
            },
          },
          {
            resource: Cart,
            options: {
              navigation: { name: 'Sales', icon: 'ShoppingBag' },
            },
          },

          // --- GROUP: MARKETING ---
          {
            resource: Banner,
            options: {
              navigation: { name: 'Marketing', icon: 'Image' },
              listProperties: ['title', 'isActive', 'displayOrder', 'redirectUrl'],
            },
          },
        ],
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }