import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddToCartDto {
  @IsNumber()
  @IsNotEmpty()
  productId: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  size?: string; // e.g., "M", "L", "42"

  @IsString()
  @IsOptional()
  color?: string; // e.g., "Red", "#FF0000"
}