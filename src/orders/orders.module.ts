import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { CartModule } from 'src/cart/cart.module';
import { AddressesModule } from 'src/addresses/addresses.module';
import { PaymentsModule } from 'src/payments/payments.module';

@Module({
    imports: [
        // 1. Database Repositories
        TypeOrmModule.forFeature([Order, OrderItem]),

        // 2. Feature Modules
        CartModule,
        AddressesModule,
        PaymentsModule,
    ],
    controllers: [OrdersController],
    providers: [OrdersService],
    exports: [OrdersService],
})
export class OrdersModule { }