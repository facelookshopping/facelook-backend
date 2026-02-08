import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CartService } from 'src/cart/cart.service';
import { User } from 'src/users/user.entity';
import { AddressesService } from 'src/addresses/addresses.service';
import { v4 as uuidv4 } from 'uuid';
import { Order, OrderStatus, PaymentType } from './order.entity';
import { OrderItem } from './order-item.entity';
import { PaymentsService } from 'src/payments/payments.service';
import { OrderTimeline } from './order-timeline.entity';

@Injectable()
export class OrdersService {
  timelineRepo: any;
  constructor(
    @InjectRepository(Order) private ordersRepo: Repository<Order>,
    private cartService: CartService,
    private addressService: AddressesService,
    private dataSource: DataSource, // For Transactions
    private paymentsService: PaymentsService
  ) { }

  // 1. Create Order (Modified for Summary & Payment Type)
  async createOrderFromCart(user: User, addressId: number, paymentType: PaymentType): Promise<Order> {
    const address = await this.addressService.findOne(addressId, user.id);
    if (!address) throw new NotFoundException('Address not found');

    const cart = await this.cartService.getCartSummary(user.id);
    if (cart.items.length === 0) throw new BadRequestException('Cart is empty');

    let itemsTotal = 0;
    const orderItems: OrderItem[] = [];

    for (const cartItem of cart.items) {
      const variant = cartItem.product.variants.find(
        v => v.size === cartItem.size && v.color === cartItem.color
      );

      if (!variant || variant.stock < cartItem.quantity) {
        throw new BadRequestException(`Item ${cartItem.product.name} (${cartItem.size}) is out of stock`);
      }

      const price = Number(cartItem.product.price);
      itemsTotal += price * cartItem.quantity;

      const orderItem = new OrderItem();
      orderItem.variant = variant;
      orderItem.productName = cartItem.product.name;
      orderItem.size = cartItem.size;
      orderItem.color = cartItem.color;
      orderItem.quantity = cartItem.quantity;
      orderItem.price = price;
      orderItems.push(orderItem);
    }

    // --- Financial Calculation Logic ---
    const shippingCost = itemsTotal > 500 ? 0 : 50; // Example: Free shipping over 500
    const taxAmount = itemsTotal * 0.18; // Example: 18% GST
    const totalAmount = itemsTotal + shippingCost + taxAmount;

    // --- Initial Timeline ---
    const timeline = new OrderTimeline();
    timeline.status = OrderStatus.PENDING;
    timeline.description = 'Order Created';

    // Calculate Estimated Delivery (e.g., 5 days from now)
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + 5);

    const order = this.ordersRepo.create({
      user,
      shippingAddress: address,
      items: orderItems,
      itemsTotal,
      shippingCost,
      taxAmount,
      totalAmount,
      paymentType,
      status: OrderStatus.PENDING,
      estimatedDeliveryDate: estimatedDate,
      orderNumber: `ORD-${uuidv4().split('-')[0].toUpperCase()}`,
      timeline: [timeline]
    });

    return this.ordersRepo.save(order);
  }

  // 2. Admin Update Status (Adds to Timeline)
  async updateStatus(orderId: number, status: OrderStatus, description?: string): Promise<Order> {
    const order = await this.ordersRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order #${orderId} not found`);

    order.status = status;

    if (status === OrderStatus.DELIVERED) {
      order.deliveredAt = new Date(); // Sets the timestamp to now
    }

    // Add to Timeline
    const timelineEntry = this.timelineRepo.create({
      order,
      status,
      description: description || `Order status updated to ${status}`
    });

    // Save timeline via relation or separately
    await this.timelineRepo.save(timelineEntry);

    // If saving order automatically cascades timeline, this is fine
    // Otherwise, ensure order.timeline.push(timelineEntry) if loading relations manually
    return this.ordersRepo.save(order);
  }

  // 3. Confirm Payment (Updated for Timeline)
  async confirmPayment(orderId: number, paymentId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        relations: ['items', 'items.variant', 'user']
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.PENDING) return order;

      // Stock Reduction
      for (const item of order.items) {
        const variant = item.variant;
        if (variant.stock < item.quantity) {
          throw new BadRequestException(`Stock for ${item.productName} ran out.`);
        }
        variant.stock -= item.quantity;
        await queryRunner.manager.save(variant);
      }

      // Update Status
      order.status = OrderStatus.PLACED; // Changed from PAID to PLACED
      order.paymentId = paymentId;
      await queryRunner.manager.save(order);

      // Add Timeline
      const timeline = queryRunner.manager.create(OrderTimeline, {
        order,
        status: OrderStatus.PLACED,
        description: 'Payment Confirmed'
      });
      await queryRunner.manager.save(timeline);

      await this.cartService.clearCart(order.user);
      await queryRunner.commitTransaction();
      return order;

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

    // ✅ FIX: Use PLACED instead of PAID
    if (order.status === OrderStatus.PLACED) {
      return { status: 'PLACED', message: 'Order already paid and placed' };
    }

    if (order.status !== OrderStatus.PENDING) {
      return { status: order.status, message: 'Order status is not pending' };
    }

    // Call PhonePe to check status
    const isPaid = await this.paymentsService.checkPaymentStatus(order.merchantTransactionId);

    if (isPaid) {
      await this.confirmPayment(orderId, order.merchantTransactionId);
      // ✅ FIX: Return PLACED status string
      return { status: 'PLACED', message: 'Payment verified successfully' };
    } else {
      return { status: 'PENDING', message: 'Payment not completed yet' };
    }
  }

  async findAllByUser(userId: number): Promise<any[]> {
    const orders = await this.ordersRepo.find({
      where: { user: { id: userId } },
      relations: [
        'user',
        'shippingAddress',
        'items',
        'items.variant',
        'items.variant.product', // Needed to access images
      ],
      order: { createdAt: 'DESC' },
    });

    // ✅ Manually transform the response to strictly control output
    return orders.map((order) => {

      // 1. Process Items to add 'productImage'
      const itemsWithImages = order.items.map((item) => {
        const productImages = item.variant?.product?.images;

        // Your Product entity has images as string[], so we take the first string directly
        const mainImage = (productImages && productImages.length > 0)
          ? productImages[0]
          : null;

        return {
          ...item,
          productImage: mainImage,
        };
      });

      // 2. Return Order with Sanitized User and Updated Items
      return {
        ...order,
        // 🔒 FORCE User to only be an object with ID
        user: {
          id: order.user.id
        },
        items: itemsWithImages,
      };
    });
  }


  async findOne(id: number, userId: number): Promise<Order> {
    const order = await this.ordersRepo.findOne({
      where: { id },
      relations: [
        'items',
        'items.variant',
        'items.variant.product', // To get product images/names
        'shippingAddress',
        'timeline'
      ],
      order: {
        timeline: { timestamp: 'ASC' } // Order events chronologically
      }
    });

    if (!order) throw new NotFoundException('Order not found');

    // Security Check: Ensure user owns this order
    if (order.user.id !== userId) {
      throw new ForbiddenException('You are not allowed to view this order');
    }

    return order;
  }

  async getTrackingDetails(id: number, userId: number) {
    const order = await this.findOne(id, userId); // Re-use findOne for security & data

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      currentStatus: order.status,
      estimatedDelivery: order.estimatedDeliveryDate,
      timeline: order.timeline.map(t => ({
        status: t.status,
        description: t.description,
        timestamp: t.timestamp,
        isCompleted: true // Since it exists in the log, it happened
      }))
    };
  }
}