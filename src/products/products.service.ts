import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { Product, Gender } from './product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) { }

  // --- PUBLIC / APP METHODS ---

  async findAll(query: any): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, gender, category, brand, minPrice, maxPrice, sort } = query;
    const skip = (page - 1) * limit;

    const qb = this.productsRepository.createQueryBuilder('product');

    // ✅ FIX: Load the 'variants' relation
    qb.leftJoinAndSelect('product.variants', 'variant');

    qb.where('product.isArchived = :isArchived', { isArchived: false });

    // Filters
    if (gender) qb.andWhere('product.gender = :gender', { gender });
    if (category) qb.andWhere('product.category = :category', { category });
    if (brand) qb.andWhere('product.brand = :brand', { brand });
    if (minPrice) qb.andWhere('product.price >= :minPrice', { minPrice });
    if (maxPrice) qb.andWhere('product.price <= :maxPrice', { maxPrice });

    // Sorting
    if (sort === 'newest') qb.orderBy('product.createdAt', 'DESC');
    else if (sort === 'price_asc') qb.orderBy('product.price', 'ASC');
    else if (sort === 'price_desc') qb.orderBy('product.price', 'DESC');
    else qb.orderBy('product.id', 'ASC'); // Default

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async search(keyword: string): Promise<Product[]> {
    return this.productsRepository
      .createQueryBuilder('product')
      .where('product.isArchived = :isArchived', { isArchived: false })
      .andWhere(new Brackets((qb) => {
        qb.where('LOWER(product.name) LIKE LOWER(:keyword)', { keyword: `%${keyword}%` })
          .orWhere('LOWER(product.description) LIKE LOWER(:keyword)', { keyword: `%${keyword}%` })
          .orWhere('LOWER(product.brand) LIKE LOWER(:keyword)', { keyword: `%${keyword}%` });
      }))
      .take(20)
      .getMany();
  }

  async findTrending(): Promise<Product[]> {
    return this.productsRepository.find({
      where: { isTrending: true },
      take: 10,
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
    return product;
  }

  // --- METADATA METHODS ---

  async getCategories(): Promise<string[]> {
    // Get distinct categories
    const result = await this.productsRepository
      .createQueryBuilder('product')
      .select('DISTINCT(product.category)', 'category')
      .getRawMany();
    return result.map(r => r.category);
  }

  async getBrands(): Promise<string[]> {
    const result = await this.productsRepository
      .createQueryBuilder('product')
      .select('DISTINCT(product.brand)', 'brand')
      .getRawMany();
    return result.map(r => r.brand);
  }

  async getColors(): Promise<string[]> {
    // Note: Since colors is an array, this is simplified. 
    // Ideally, you'd have a separate Color entity or hardcode standard colors.
    return ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Pink'];
  }

  // --- ADMIN METHODS ---

  async create(productData: Partial<Product>): Promise<Product> {
    const product = this.productsRepository.create(productData);
    return this.productsRepository.save(product);
  }

  async update(id: number, updateData: Partial<Product>): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateData);
    return this.productsRepository.save(product);
  }

  async delete(id: number): Promise<void> {
    const result = await this.productsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
  }
}