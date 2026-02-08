import { IsEnum, IsString, IsArray, ArrayMinSize, IsOptional, IsNumber } from 'class-validator';

export enum TryOnCategory {
  TOPS = 'tops',
  BOTTOMS = 'bottoms',
  ONE_PIECES = 'one-pieces',
}

export class GenerateTryOnDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userImageUrls: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  garmentImageUrls: string[]; // Usually this is the product image

  @IsEnum(TryOnCategory)
  category: TryOnCategory;

  @IsString()
  @IsOptional()
  description?: string;

  // ✅ NEW: ID of the product being tried on
  @IsNumber()
  @IsOptional()
  productId?: number; 
}