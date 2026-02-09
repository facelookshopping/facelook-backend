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
    AdminModule.createAdminAsync({
      imports: [UsersModule], // Import module containing UsersService
      inject: [UsersService], // Inject service to verify login
      useFactory: (usersService: UsersService) => ({
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
                // Example: Only Superadmin can delete users
                actions: {
                  delete: {
                    isAccessible: ({ currentAdmin }) => currentAdmin && currentAdmin.role === 'superadmin',
                  }
                }
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

        // ✅ AUTHENTICATION LOGIC
        auth: {
          authenticate: async (email, password) => {
            try {
              const user = await usersService.findOneByEmail(email);

              // FIX 1: Check if user exists AND has a password (social login users have no password)
              if (user && user.password && (user.role === 'admin' || user.role === 'superadmin')) {

                // FIX 2: Now TypeScript knows 'user.password' is definitely a string
                const isMatch = await bcrypt.compare(password, user.password);

                if (isMatch) {
                  return { email: user.email, role: user.role };
                }
              }
            } catch (error) {
              console.error('Admin Login Error:', error);
            }
            return null;
          },
          cookieName: 'adminjs',
          cookiePassword: process.env.ADMIN_COOKIE_PASS || 'super-secret-cookie-password-change-this',
        },

        // ✅ SESSION CONFIGURATION
        sessionOptions: {
          resave: true,
          saveUninitialized: false,
          secret: process.env.ADMIN_SESSION_SECRET || 'super-secret-session-key-change-this',
        },
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }