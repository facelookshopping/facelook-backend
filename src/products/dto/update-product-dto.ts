import { PartialType, OmitType } from '@nestjs/mapped-types'; // Use '@nestjs/swagger' if you use Swagger
import { CreateProductDto } from './create-product.dto';

// 1. Omit 'variants' so admins can't accidentally overwrite the array
// 2. PartialType makes all remaining fields (name, price, etc.) optional
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['variants'] as const),
) {}