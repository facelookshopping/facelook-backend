import { IsInt, IsNotEmpty } from 'class-validator';

export class FavoriteDto {
  @IsInt()
  @IsNotEmpty()
  productId: number;
}