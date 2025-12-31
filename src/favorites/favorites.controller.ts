import {
  Controller,
  UseGuards,
  Post,
  Body,
  Get,
  Param,
  ParseIntPipe,
  DefaultValuePipe,
  Query,
  Req,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import type { AuthenticatedRequest } from 'src/types/express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FavoriteDto } from './dto/favorite.dto';
import { RolesGuard } from 'src/auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) { }

  // ✅ ONE BUTTON LOGIC: Add or Remove
  @Post('toggle')
  async toggleFavorite(
    @Req() req: AuthenticatedRequest,
    @Body() dto: FavoriteDto
  ) {
    return this.favoritesService.toggleFavorite(req.user, dto.productId);
  }

  // Check status (Is the heart filled?)
  @Get('check/:productId')
  async checkStatus(
    @Req() req: AuthenticatedRequest,
    @Param('productId', ParseIntPipe) productId: number
  ) {
    const isFav = await this.favoritesService.isFavored(req.user.id, productId);
    return { isFavorite: isFav };
  }

  @Get()
  async getFavorites(
    @Req() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.favoritesService.findPaginatedByUser(req.user.id, page, limit);
  }
}