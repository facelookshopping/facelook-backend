import {
  Controller, Post, Body, Param, Patch, Delete, UseGuards,
  ParseIntPipe, UseInterceptors, UploadedFiles, BadRequestException,
  Get
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProductsService } from '../products.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserRole } from 'src/users/user.entity';
import { CreateProductDto } from '../dto/create-product.dto';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { UpdateProductDto } from '../dto/update-product-dto';

// --- File Naming Helper ---
const editFileName = (req, file, callback) => {
  const name = file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '-');
  const fileExtName = extname(file.originalname);
  const randomName = Array(4).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
  callback(null, `${name}-${randomName}${fileExtName}`);
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) { }

  // 1. Create Product (Multipart Support)
  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @UseInterceptors(
    FilesInterceptor('files', 10, { // Max 10 files
      storage: diskStorage({
        destination: './uploads', // ✅ Saves to Hostinger disk mapped via Docker volume
        filename: editFileName,
      }),
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
          return callback(new BadRequestException('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
  async create(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body: any // Raw body from FormData is all strings
  ) {
    // A. Parse form-data strings back to Typed Data
    const parsedBody = { ...body };

    try {
      if (body.variants && typeof body.variants === 'string') parsedBody.variants = JSON.parse(body.variants);
      if (body.price) parsedBody.price = parseFloat(body.price);
      if (body.isTrending) parsedBody.isTrending = body.isTrending === 'true';
      // Add other conversions if needed (e.g. brand, category are already strings)
    } catch (e) {
      throw new BadRequestException('Invalid JSON format in variants or fields');
    }

    // B. Handle Images
    if (files && files.length > 0) {
      const appUrl = process.env.APP_URL || 'https://api.facelookshopping.in';
      // Map file paths to Full URLs
      parsedBody.images = files.map(file => `${appUrl}/uploads/${file.filename}`);
    } else {
      parsedBody.images = []; // Handle case with no images
    }

    // C. Validate & Call Service
    // We cast to CreateProductDto to ensure Typescript is happy, 
    // though class-validator in the Service will do the real check.
    return this.productsService.create(parsedBody as CreateProductDto);
  }

  @Get('variants')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async getAllVariants() {
    return this.productsService.findAllVariants();
  }

  // 2. Add Variant
  @Post(':id/variants')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  addVariant(
    @Param('id', ParseIntPipe) id: number,
    @Body() createVariantDto: CreateVariantDto
  ) {
    return this.productsService.addVariant(id, createVariantDto);
  }

  // 3. Update Product
  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateData);
  }

  // 4. Delete (Archive)
  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.update(id, { isArchived: true } as any);
  }
}