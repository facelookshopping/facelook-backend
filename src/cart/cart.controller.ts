
import {
  Controller, Post, Get, Patch, Delete, Body, Param,
  UseGuards, Req, ParseIntPipe
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/types/express';
import { RolesGuard } from 'src/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @Post('add')
  async addToCart(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddToCartDto, // Uses DTO now
  ) {
    return this.cartService.addOrUpdateCart(req.user, dto);
  }

  @Get()
  async getMyCart(@Req() req: AuthenticatedRequest) {
    // Returns Items + Total Price (Easier for Flutter to display)
    return this.cartService.getCartSummary(req.user.id);
  }

  @Patch(':id')
  async updateQuantity(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body('quantity') quantity: number,
  ) {
    const result = await this.cartService.updateQuantity(id, quantity, req.user);

    // If result is null, it means item was removed (quantity 0)
    if (!result) {
      return { message: 'Item removed from cart' };
    }

    // Otherwise return the updated item
    return result;
  }

  @Delete(':id')
  async removeCartItem(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.cartService.removeCartItem(id, req.user);
  }

  @Delete() // Route: DELETE /cart (Clears whole cart)
  async clearCart(@Req() req: AuthenticatedRequest) {
    return this.cartService.clearCart(req.user);
  }
}
