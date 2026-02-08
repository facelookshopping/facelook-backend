import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { PaymentType } from '../order.entity';

export class CreateOrderDto {
  @IsInt()
  @IsNotEmpty()
  addressId: number;

  @IsEnum(PaymentType)
  @IsNotEmpty()
  paymentType: PaymentType;
}