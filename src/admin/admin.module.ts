import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from '@adminjs/nestjs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ComponentLoader } from 'adminjs';

// --- Entities ---
import { User } from '../users/user.entity';
import { Address } from '../addresses/address.entity';
import { Product } from '../products/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Banner } from '../banners/banner.entity';
import { Order } from '../orders/order.entity';
import { OrderItem } from '../orders/order-item.entity';
import { Cart } from '../cart/cart.entity';
import { Favorite } from '../favorites/favorite.entity';
import { TryOn } from '../try-on/try-on.entity';

// --- Enums ---
import { UserRole } from '../users/user.entity';
import { Gender } from '../products/product.entity';
import { OrderStatus } from '../orders/order.enums';
import { Database, Resource } from '@adminjs/typeorm';

// --- Features ---
// ✅ Import the Upload Feature (Version 3.x logic)
import uploadFeature from '@adminjs/upload';
import { AdminAuthService } from './admin-auth.service';
import AdminJS from 'adminjs';
import { UsersModule } from 'src/users/users.module';
import { AdminAuthModule } from './admin-auth.module';
// import { dark, light, noSidebar } from '@adminjs/themes'; 

AdminJS.registerAdapter({ Database, Resource });

const componentLoader = new ComponentLoader();
const Components = {
  ImageList: componentLoader.add('ImageList', './components/ImageRequest'),
};

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Product, Order]),
    UsersModule,
    AdminAuthModule,
    AdminModule.createAdminAsync({
      imports: [AdminAuthModule],
      inject: [AdminAuthService],
      useFactory: async (adminAuthService: AdminAuthService) => {
        const { dark, light, noSidebar } = await import('@adminjs/themes');
        return {
          adminJsOptions: {
            rootPath: '/admin',
            componentLoader,
            branding: {
              companyName: 'FaceLook Store',
              logo: '/uploads/logo.png',
              withMadeWithLove: false,
              softwareBrothers: false,
              theme: {
                colors: {
                  primary100: '#4D70EB', // Custom primary color (optional)
                }
              }
            },
            defaultTheme: 'dark', // Set your preferred default (dark or light)
            availableThemes: [dark, light, noSidebar],
            resources: [
              // =========================================================
              // 👥 GROUP 1: CUSTOMERS & STAFF
              // =========================================================
              {
                resource: User,
                options: {
                  navigation: { name: 'User Management', icon: 'Users' },
                  listProperties: ['id', 'name', 'email', 'phoneNumber', 'role', 'isVerified'],
                  showProperties: ['name', 'email', 'role', 'addresses', 'orders'],
                  editProperties: ['name', 'email', 'phoneNumber', 'role', 'isVerified', 'isBlocked'],
                  properties: {
                    password: { isVisible: false },
                    currentHashedRefreshToken: { isVisible: false },
                    fcmToken: { isVisible: false },
                    role: {
                      availableValues: Object.values(UserRole).map((r) => ({ value: r, label: r.toUpperCase() })),
                    },
                  },
                  actions: {
                    delete: { isAccessible: true },
                  },
                },
              },
              {
                resource: Address,
                options: { navigation: false, listProperties: ['label', 'city', 'state', 'zipCode', 'phoneNumber'] },
              },
              {
                resource: TryOn,
                options: {
                  navigation: { name: 'User Management', icon: 'Camera' },
                  listProperties: ['user', 'type', 'status', 'createdAt'],
                  properties: {
                    imageUrls: { type: 'mixed', isVisible: { list: false, show: true, edit: false } },
                  },
                  actions: { new: { isAccessible: false }, edit: { isAccessible: false }, delete: { isAccessible: true } },
                },
              },

              // =========================================================
              // 📦 GROUP 2: CATALOG (Products) - ✅ UPDATED
              // =========================================================
              {
                resource: Product,
                options: {
                  list: {
                    handler: async (request, response, context) => {
                      const { currentAdmin, _admin } = context;

                      // If SuperAdmin, show everything. If Admin, show only their products.
                      if (currentAdmin.role !== 'SUPERADMIN') {
                        request.query = {
                          ...request.query,
                          'filters.ownerId': currentAdmin.id, // 👈 THE MAGIC FILTER
                        };
                      }

                      return _admin.actions.list.handler(request, response, context);
                    },
                  },

                  // 2. AUTO-ASSIGN OWNER ON CREATION
                  new: {
                    before: async (request, context) => {
                      const { currentAdmin } = context;
                      if (request.method === 'post') {
                        // Automatically set the ownerId to the logged-in user's ID
                        request.payload = {
                          ...request.payload,
                          ownerId: currentAdmin.id,
                        };
                      }
                      return request;
                    },
                  },
                  navigation: { name: 'Catalog', icon: 'Package' },
                  // 1. Show 'coverImage' in the list instead of 'images'
                  listProperties: ['id', 'coverImage', 'name', 'price', 'stock', 'gender', 'isTrending'],

                  showProperties: [
                    'coverImage', // Custom Image Viewer
                    'name',
                    'description',
                    'price',
                    'gender',
                    'category',
                    'brand',
                    'stock',
                    'isTrending',
                    'isArchived'
                  ],

                  editProperties: [
                    'name', 'description', 'price', 'gender', 'category', 'brand',
                    'uploadFile', // Keep drag-drop for editing
                    'isTrending', 'isArchived'
                  ],

                  properties: {
                    name: { isTitle: true },
                    description: { type: 'textarea', isVisible: { list: false, show: true, edit: true, filter: true } },
                    gender: {
                      availableValues: Object.values(Gender).map((g) => ({ value: g, label: g })),
                    },
                    price: { type: 'number' },

                    // 2. Hide the raw array in the list (it looks ugly)
                    images: { isVisible: false },

                    // 3. Create a VIRTUAL column for the List View
                    coverImage: {
                      isVisible: { list: true, show: false, edit: false, filter: false },
                      components: {
                        list: Components.ImageList,
                        show: Components.ImageList,
                      },
                    },
                  },
                },
                features: [
                  uploadFeature({
                    provider: {
                      local: {
                        bucket: 'uploads',
                        opts: { baseUrl: '/uploads' },
                      },
                    },
                    properties: {
                      key: 'images',
                      file: 'uploadFile',
                      filesToDelete: 'filesToDelete',
                    },
                    multiple: true,
                    validation: { mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/jpg'] },
                  }),
                ],
              },
              {
                resource: ProductVariant,
                options: {
                  navigation: { name: 'Catalog', icon: 'Layers' },
                  parent: { name: 'Catalog' },

                  // ✅ FIX: Use 'productId' for EVERYTHING
                  listProperties: ['productId', 'sku', 'size', 'color', 'stock'],
                  editProperties: ['productId', 'sku', 'size', 'color', 'stock', 'priceOverride'],

                  properties: {
                    // 1. HIDE the Relation Object completely (It causes the saving bug)
                    product: {
                      isVisible: false,
                    },

                    // 2. CONFIGURE the ID Column to act like the Relation
                    productId: {
                      // Show in all views
                      isVisible: { list: true, show: true, edit: true, filter: true },

                      label: 'Product',      // Rename header to "Product"
                      reference: 'Product',  // 👈 This makes it a Dropdown!
                      isRequired: true,
                    },
                  },
                },
              },

              // =========================================================
              // 🛒 GROUP 3: SALES & FINANCE
              // =========================================================
              {
                resource: Order,
                options: {
                  navigation: { name: 'Sales', icon: 'ShoppingCart' },
                  listProperties: ['orderNumber', 'user', 'totalAmount', 'status', 'paymentType', 'createdAt'],
                  showProperties: ['orderNumber', 'user', 'shippingAddress', 'items', 'timeline', 'financials'],
                  editProperties: ['status', 'estimatedDeliveryDate', 'deliveredAt'],
                  sort: { sortBy: 'createdAt', direction: 'desc' },
                  properties: {
                    status: {
                      availableValues: Object.values(OrderStatus).map((s) => ({ value: s, label: s })),
                    },
                    totalAmount: { isVisible: { edit: false, show: true, list: true } },
                    itemsTotal: { isVisible: { edit: false, show: true, list: false } },
                  },
                  actions: {
                    delete: { isAccessible: false },
                    new: { isAccessible: false },
                  },
                },
              },
              { resource: OrderItem, options: { navigation: false } },
              { resource: Cart, options: { navigation: false, actions: { new: { isAccessible: false }, edit: { isAccessible: false } } } },

              // =========================================================
              // 📢 GROUP 4: MARKETING
              // =========================================================
              {
                resource: Banner,
                options: {
                  navigation: { name: 'Marketing', icon: 'Image' },
                  listProperties: ['title', 'isActive', 'displayOrder', 'redirectUrl'],
                  sort: { sortBy: 'displayOrder', direction: 'asc' },
                },
                // ✅ Optional: Allow Upload for Banners too
                features: [
                  uploadFeature({
                    provider: { local: { bucket: 'uploads', opts: { baseUrl: '/uploads' } } },
                    properties: { key: 'imageUrl', file: 'uploadFile' }, // Maps to banner.imageUrl
                    multiple: false,
                  }),
                ]
              },
              { resource: Favorite, options: { navigation: false, actions: { new: { isAccessible: false }, edit: { isAccessible: false }, delete: { isAccessible: false } } } },
            ],
            auth: {
              authenticate: async (email, password) => {
                const user = await adminAuthService.validateUser(email, password);
                if (user) {
                  // Return the Current User to AdminJS
                  return { email: user.email, role: user.role, id: user.id };
                }
                return null;
              },
              cookieName: 'adminjs',
              cookiePassword: 'some-very-secure-password-keep-this-secret',
            },
            sessionOptions: {
              resave: false,
              saveUninitialized: false,
              secret: 'session-secret',
            },
          },
        }
      },
    }),
  ],
  // providers: [AdminAuthService],
  exports: [AdminModule],
})
export class AdminPanelModule { }