import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderTimeline } from './order-timeline.entity'; // ✅ Added
import { CartModule } from 'src/cart/cart.module';
import { AddressesModule } from 'src/addresses/addresses.module';
import { PaymentsModule } from 'src/payments/payments.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Order, OrderItem, OrderTimeline]), // ✅ Added
        CartModule,
        AddressesModule,
        PaymentsModule,
    ],
    controllers: [OrdersController, AdminOrdersController],
    providers: [OrdersService],
    exports: [OrdersService],
})
export class OrdersModule { }