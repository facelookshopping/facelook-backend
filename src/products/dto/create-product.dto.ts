import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, IsBoolean, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { Gender } from '../product.entity';
import { CreateVariantDto } from './create-variant.dto';

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    price: number;

    @IsEnum(Gender)
    gender: Gender;

    @IsString()
    category: string;

    @IsString()
    brand: string;

    @IsArray()
    @IsString({ each: true })
    images: string[];

    @IsBoolean()
    @IsOptional()
    isTrending?: boolean;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateVariantDto)
    @IsOptional()
    variants: CreateVariantDto[];
}