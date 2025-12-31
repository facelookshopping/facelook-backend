import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CartService } from 'src/cart/cart.service';
import { User } from 'src/users/user.entity';
import { AddressesService } from 'src/addresses/addresses.service';
import { v4 as uuidv4 } from 'uuid';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { PaymentsService } from 'src/payments/payments.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private ordersRepo: Repository<Order>,
    private cartService: CartService,
    private addressService: AddressesService,
    private dataSource: DataSource, // For Transactions
    private paymentsService: PaymentsService
  ) { }

  // 1. Create Order from Cart (Called BEFORE Payment)
  async createOrderFromCart(user: User, addressId: number): Promise<Order> {

    // A. Validate Address
    const address = await this.addressService.findOne(addressId, user.id);
    if (!address) throw new NotFoundException('Address not found');

    // B. Get Cart Items
    const cart = await this.cartService.getCartSummary(user.id);
    if (cart.items.length === 0) throw new BadRequestException('Cart is empty');

    // C. Calculate Total & Prepare Items
    let totalAmount = 0;
    const orderItems: OrderItem[] = [];

    for (const cartItem of cart.items) {
      // Find the variant
      const variant = cartItem.product.variants.find(
        v => v.size === cartItem.size && v.color === cartItem.color
      );

      if (!variant || variant.stock < cartItem.quantity) {
        throw new BadRequestException(`Item ${cartItem.product.name} (${cartItem.size}) is out of stock`);
      }

      const price = Number(cartItem.product.price); // Use DB Price!
      totalAmount += price * cartItem.quantity;

      const orderItem = new OrderItem();
      orderItem.variant = variant;
      orderItem.productName = cartItem.product.name;
      orderItem.size = cartItem.size;
      orderItem.color = cartItem.color;
      orderItem.quantity = cartItem.quantity;
      orderItem.price = price;
      orderItems.push(orderItem);
    }

    // D. Save Order (Pending)
    const order = this.ordersRepo.create({
      user,
      shippingAddress: address,
      items: orderItems,
      totalAmount,
      status: OrderStatus.PENDING,
      orderNumber: `ORD-${uuidv4().split('-')[0].toUpperCase()}`, // ORD-A1B2C3
    });

    return this.ordersRepo.save(order);
  }

  async updateStatus(orderId: number, status: OrderStatus): Promise<Order> {
    const order = await this.ordersRepo.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    // Optional: Add logic here to prevent weird status jumps 
    // (e.g., prevent changing 'Delivered' back to 'Pending')

    order.status = status;
    return this.ordersRepo.save(order);
  }

  // 2. Confirm Payment & Reduce Stock (Called AFTER Payment Success)
  async confirmPayment(orderId: number, paymentId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        relations: ['items', 'items.variant', 'user']
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== OrderStatus.PENDING) return order;

      // Reduce Stock for each item
      for (const item of order.items) {
        const variant = item.variant;
        if (variant.stock < item.quantity) {
          throw new BadRequestException(`Stock for ${item.productName} ran out during payment.`);
        }
        variant.stock -= item.quantity;
        await queryRunner.manager.save(variant); // Save new stock
      }

      // Update Order Status
      order.status = OrderStatus.PAID;
      order.paymentId = paymentId;
      const savedOrder = await queryRunner.manager.save(order);

      // Clear User Cart
      await this.cartService.clearCart(order.user);

      await queryRunner.commitTransaction();
      return savedOrder;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // Add these methods inside OrdersService

  async updatePaymentInfo(orderId: number, merchantTxnId: string) {
    await this.ordersRepo.update(orderId, { merchantTransactionId: merchantTxnId });
  }

  async verifyAndCompleteOrder(orderId: number) {
    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === OrderStatus.PAID) {
      return { status: 'PAID', message: 'Order already paid' };
    }

    // Call PhonePe to check status
    // We need to inject PaymentsService into OrdersService (add to constructor)
    // Ensure circular dependency is handled if any (use forwardRef if needed)
    const isPaid = await this.paymentsService.checkPaymentStatus(order.merchantTransactionId);

    if (isPaid) {
      // Reuse your existing confirmPayment logic here
      await this.confirmPayment(orderId, order.merchantTransactionId);
      return { status: 'PAID', message: 'Payment verified successfully' };
    } else {
      return { status: 'PENDING', message: 'Payment not completed yet' };
    }
  }

  async findAllByUser(userId: number): Promise<Order[]> {
    return this.ordersRepo.find({
      where: { user: { id: userId } },
      relations: ['items', 'items.variant'], // Load items & variants
      order: { createdAt: 'DESC' }, // Newest first
    });
  }
}