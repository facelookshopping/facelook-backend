import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Cart } from './cart.entity';
import { User } from '../users/user.entity';
import { ProductsService } from '../products/products.service'; // Import Product Service
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    private productsService: ProductsService, // Inject Product Service
  ) { }

  async addOrUpdateCart(user: User, dto: AddToCartDto): Promise<Cart> {
    const { productId, quantity, size, color } = dto;

    // 1. Check if Product Exists & Check Stock
    const product = await this.productsService.findOne(productId);

    if (product.stock < quantity) {
      throw new BadRequestException(`Not enough stock. Only ${product.stock} left.`);
    }

    // 2. Check if this specific variation is already in cart
    let cartItem = await this.cartRepository.findOne({
      where: {
        user: { id: user.id },
        product: { id: productId },
        size: size || IsNull(),
        color: color || IsNull()
      },
    });

    if (cartItem) {
      // 3A. Update Quantity
      const newQuantity = cartItem.quantity + quantity;
      if (product.stock < newQuantity) {
        throw new BadRequestException(`Cannot add more. Limit reached.`);
      }
      cartItem.quantity = newQuantity;
    } else {
      // 3B. Create New Cart Item
      cartItem = this.cartRepository.create({
        user: { id: user.id },
        product: { id: productId },
        quantity,
        size,
        color,
      });
    }

    return this.cartRepository.save(cartItem);
  }

  async getCartSummary(userId: number): Promise<{ items: Cart[]; totalAmount: number; totalItems: number }> {
    const items = await this.cartRepository.find({
      where: { user: { id: userId } },
      // ✅ FIX: Add 'product.variants' here
      relations: ['product', 'product.variants'],
      order: { createdAt: 'DESC' }
    });

    // Calculate Total Price
    const totalAmount = items.reduce((sum, item) => {
      // If product is archived, do NOT add cost
      if (item.product.isArchived) {
        return sum;
      }
      return sum + (Number(item.product.price) * item.quantity);
    }, 0);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return { items, totalAmount, totalItems };
  }

  async updateQuantity(cartId: number, quantity: number, user: User): Promise<Cart | null> {
    const cartItem = await this.cartRepository.findOne({
      where: { id: cartId, user: { id: user.id } },
      relations: ['product']
    });

    if (!cartItem) throw new NotFoundException('Cart item not found');

    if (quantity <= 0) {
      await this.removeCartItem(cartId, user);
      return null;
    }

    // Check stock again
    if (cartItem.product.stock < quantity) {
      throw new BadRequestException('Not enough stock available');
    }

    cartItem.quantity = quantity;
    return this.cartRepository.save(cartItem);
  }

  async removeCartItem(cartId: number, user: User): Promise<void> {
    const result = await this.cartRepository.delete({ id: cartId, user: { id: user.id } });
    if (result.affected === 0) throw new NotFoundException('Cart item not found');
  }

  async clearCart(user: User): Promise<void> {
    await this.cartRepository.delete({ user: { id: user.id } });
  }
}