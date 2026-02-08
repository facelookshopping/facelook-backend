import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../order.entity';

export class UpdateOrderStatusDto {
    @IsEnum(OrderStatus)
    status: OrderStatus;

    @IsOptional()
    @IsString()
    description?: string;
}