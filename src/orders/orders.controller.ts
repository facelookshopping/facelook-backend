import { Controller, Post, Body, UseGuards, Req, Get, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PaymentsService } from 'src/payments/payments.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private paymentsService: PaymentsService,
  ) {}

  // 1. Create Order & Get PhonePe Link
  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  async initiateOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    // A. Create Internal Order (Pending)
    const order = await this.ordersService.createOrderFromCart(req.user, dto.addressId);

    // B. Initiate PhonePe
    const paymentData = await this.paymentsService.initiatePhonePePayment(
      order.totalAmount,
      order.orderNumber,
      req.user.id.toString(),
      req.user.phoneNumber // Ensure User entity has phoneNumber
    );

    // C. Save Transaction ID to Order
    await this.ordersService.updatePaymentInfo(order.id, paymentData.merchantTransactionId);

    return { 
      paymentUrl: paymentData.paymentUrl,
      merchantTransactionId: paymentData.merchantTransactionId,
      internalOrderId: order.id
    };
  }

  // 2. Check Status (Called by Flutter after returning from Payment Page)
  @UseGuards(JwtAuthGuard)
  @Get('status')
  async checkStatus(@Query('orderId') orderId: number) {
    return this.ordersService.verifyAndCompleteOrder(orderId);
  }

  @Get()
  async getMyOrders(@Req() req: any) {
    return this.ordersService.findAllByUser(req.user.id);
  }
}