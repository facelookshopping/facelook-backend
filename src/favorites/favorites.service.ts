import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './favorite.entity';
import { User } from '../users/user.entity';
import { ProductsService } from '../products/products.service'; // 👈 Import this

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private favoritesRepository: Repository<Favorite>,
    private productsService: ProductsService, // 👈 Inject Product Service
  ) { }

  // ✅ BEST PRACTICE: Toggle (Like/Unlike in one click)
  async toggleFavorite(user: User, productId: number): Promise<{ status: string }> {
    // 1. Check if product exists AND is valid (not archived)
    const product = await this.productsService.findOne(productId);

    // ✅ FIX: Block if product is null OR archived
    if (!product || product.isArchived) {
      throw new NotFoundException('Product not found or unavailable');
    }

    // 2. Check if already favored
    const existing = await this.favoritesRepository.findOne({
      where: { user: { id: user.id }, product: { id: productId } },
    });

    if (existing) {
      // 3A. If exists -> Remove it (Unlike)
      await this.favoritesRepository.remove(existing);
      return { status: 'removed' };
    } else {
      // 3B. If not exists -> Add it (Like)
      const favorite = this.favoritesRepository.create({
        user: { id: user.id },
        product: { id: productId },
      });
      await this.favoritesRepository.save(favorite);
      return { status: 'added' };
    }
  }

  // Check if a specific product is favored (For UI Heart Icon state)
  async isFavored(userId: number, productId: number): Promise<boolean> {
    const count = await this.favoritesRepository.count({
      where: { user: { id: userId }, product: { id: productId } }
    });
    return count > 0;
  }

  async findPaginatedByUser(
    userId: number,
    page: number,
    limit: number,
  ) {
    const [data, total] = await this.favoritesRepository.findAndCount({
      where: { 
        user: { id: userId },
        // ✅ FIX: Filter out archived products
        product: { isArchived: false } 
      },
      relations: ['product'], // Load product details
      order: { createdAt: 'DESC' }, // Newest first
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }
}