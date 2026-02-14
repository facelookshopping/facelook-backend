import { Controller, Get, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './product.entity';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  // --- METADATA ENDPOINTS ---
  @Get('categories')
  getCategories() {
    return this.productsService.getCategories();
  }

  @Get('brands')
  getBrands() {
    return this.productsService.getBrands();
  }

  @Get('colors')
  getColors() {
    return this.productsService.getColors();
  }

  // --- PRODUCT ENDPOINTS ---

  @Get('products/search') // Must be before :id
  search(@Query('q') keyword: string) {
    return this.productsService.search(keyword);
  }

  @Get('products/trending') // Must be before :id
  getTrending() {
    return this.productsService.findTrending();
  }

  @Get('products')
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('gender') gender?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('sort') sort?: string,
  ) {
    return this.productsService.findAll({ page, limit, gender, category, minPrice, maxPrice, sort });
  }

  @Get('variants') // 👈 Access via: GET /products/variants
  getAllVariants() {
    return this.productsService.findAllVariants();
  }

  @Get('products/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }
}