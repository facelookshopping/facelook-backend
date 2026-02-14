import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, DataSource } from 'typeorm';
import { Product } from './product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateProductDto } from './dto/update-product-dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private variantsRepository: Repository<ProductVariant>,
    private dataSource: DataSource,
  ) { }

  // --- 1. HELPER: Recalculate Stock & Colors ---
  private async syncProductData(productId: number) {
    const product = await this.productsRepository.findOne({
      where: { id: productId },
      relations: ['variants'],
    });

    if (!product) return;

    // Sum stock from variants
    const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);

    // Extract unique colors
    const uniqueColors = [...new Set(product.variants.map(v => v.color))];

    product.stock = totalStock;
    product.colors = uniqueColors;

    await this.productsRepository.save(product);
  }

  // --- 2. CREATE PRODUCT ---
  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { variants, ...productData } = createProductDto;

    // 1. Calculate Stock/Colors ONLY if variants exist
    let calculatedStock = 0;
    let calculatedColors: string[] = [];

    if (variants && variants.length > 0) {
      calculatedStock = variants.reduce((sum, v) => sum + v.stock, 0);
      calculatedColors = [...new Set(variants.map(v => v.color))];
    } else {
      // Fallback for AdminJS creation (empty product)
      calculatedStock = 0;
      calculatedColors = [];
    }

    // 2. Create Parent
    const product = this.productsRepository.create({
      ...productData,
      stock: calculatedStock,
      colors: calculatedColors,
    });

    const savedProduct = await this.productsRepository.save(product);

    // 3. Save Variants (Only if they exist)
    if (variants && variants.length > 0) {
      const variantEntities = variants.map(v => this.variantsRepository.create({
        ...v,
        product: savedProduct
      }));
      await this.variantsRepository.save(variantEntities);
    }

    return this.findOne(savedProduct.id);
  }

  // --- 3. ADD VARIANT ---
  async addVariant(productId: number, createVariantDto: CreateVariantDto) {
    const product = await this.productsRepository.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const existingSku = await this.variantsRepository.findOne({ where: { sku: createVariantDto.sku } });
    if (existingSku) throw new BadRequestException(`SKU ${createVariantDto.sku} already exists`);

    const variant = this.variantsRepository.create({
      ...createVariantDto,
      product: product, // ⚠️ This links the OLD product (Stock: 10)
    });

    await this.variantsRepository.save(variant);

    // This updates the Database to the NEW Stock (e.g., 22)
    await this.syncProductData(productId);

    // ✅ NEW LINE: Reload the product so the response has the NEW Stock
    variant.product = (await this.productsRepository.findOne({ where: { id: productId } }))!;

    return variant;
  }

  // --- READ Methods ---
  async findAll(query: any): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, gender, category, brand, minPrice, maxPrice, sort } = query;
    const skip = (page - 1) * limit;

    const qb = this.productsRepository.createQueryBuilder('product');
    qb.leftJoinAndSelect('product.variants', 'variant');
    qb.where('product.isArchived = :isArchived', { isArchived: false });

    if (gender) qb.andWhere('product.gender = :gender', { gender });
    if (category) qb.andWhere('product.category = :category', { category });
    if (brand) qb.andWhere('product.brand = :brand', { brand });
    if (minPrice) qb.andWhere('product.price >= :minPrice', { minPrice });
    if (maxPrice) qb.andWhere('product.price <= :maxPrice', { maxPrice });

    if (sort === 'newest') qb.orderBy('product.createdAt', 'DESC');
    else if (sort === 'price_asc') qb.orderBy('product.price', 'ASC');
    else if (sort === 'price_desc') qb.orderBy('product.price', 'DESC');
    else qb.orderBy('product.id', 'ASC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { total, page: Number(page), limit: Number(limit), data };
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['variants']
    });
    if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
    return product;
  }

  // --- METADATA (Implementations) ---
  async getCategories(): Promise<string[]> {
    const result = await this.productsRepository
      .createQueryBuilder('product')
      .select('DISTINCT(product.category)', 'category')
      .where('product.isArchived = :isArchived', { isArchived: false })
      .getRawMany();
    return result.map(r => r.category).filter(c => c);
  }

  async getBrands(): Promise<string[]> {
    const result = await this.productsRepository
      .createQueryBuilder('product')
      .select('DISTINCT(product.brand)', 'brand')
      .where('product.isArchived = :isArchived', { isArchived: false })
      .getRawMany();
    return result.map(r => r.brand).filter(b => b);
  }

  async getColors(): Promise<string[]> {
    // Return hardcoded standard colors or fetch distinct from DB if needed
    return ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Pink', 'Grey', 'Brown', 'Purple'];
  }

  // Search and Trending implementations...
  async search(keyword: string): Promise<Product[]> {
    return this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.variants', 'variant')
      .where('product.isArchived = :isArchived', { isArchived: false })
      .andWhere(new Brackets((qb) => {
        qb.where('LOWER(product.name) LIKE LOWER(:keyword)', { keyword: `%${keyword}%` })
          .orWhere('LOWER(product.description) LIKE LOWER(:keyword)', { keyword: `%${keyword}%` })
          .orWhere('LOWER(product.brand) LIKE LOWER(:keyword)', { keyword: `%${keyword}%` })
          .orWhere('LOWER(variant.sku) LIKE LOWER(:keyword)', { keyword: `%${keyword}%` });
      }))
      .take(20)
      .getMany();
  }

  async findTrending(): Promise<Product[]> {
    return this.productsRepository.find({
      where: { isTrending: true, isArchived: false },
      take: 10,
      order: { updatedAt: 'DESC' },
      relations: ['variants']
    });
  }

  // --- UPDATE ---
  async update(id: number, updateData: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateData);
    return this.productsRepository.save(product);
  }

  async findAllVariants(): Promise<ProductVariant[]> {
    return this.variantsRepository.find({
      relations: ['product'], // Load the parent product details
      order: {
        id: 'DESC' // Show newest variants first
      }
    });
  }
}