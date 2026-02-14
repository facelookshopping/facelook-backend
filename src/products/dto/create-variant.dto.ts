import { IsString, IsNotEmpty, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateVariantDto {
    @IsString()
    @IsNotEmpty()
    size: string;

    @IsString()
    @IsNotEmpty()
    color: string;

    @IsInt()
    @Min(0)
    stock: number;

    @IsString()
    @IsNotEmpty()
    sku: string;

    @IsNumber()
    @IsOptional()
    priceOverride?: number;
}