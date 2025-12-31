import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './banner.entity';
import { CreateBannerDto } from './dto/create-banner.dto';

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private bannerRepository: Repository<Banner>,
  ) {}

  // For Admin: Create a new banner
  async create(dto: CreateBannerDto): Promise<Banner> {
    const banner = this.bannerRepository.create(dto);
    return this.bannerRepository.save(banner);
  }

  // For App: Get only ACTIVE banners, sorted by order
  async findAllActive(): Promise<Banner[]> {
    return this.bannerRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  // For Admin: Get ALL banners (including hidden ones)
  async findAllAdmin(): Promise<Banner[]> {
    return this.bannerRepository.find({
      order: { displayOrder: 'ASC' },
    });
  }

  async update(id: number, attrs: Partial<Banner>): Promise<Banner> {
    const banner = await this.bannerRepository.findOne({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    Object.assign(banner, attrs);
    return this.bannerRepository.save(banner);
  }

  async remove(id: number): Promise<void> {
    const banner = await this.bannerRepository.findOne({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    await this.bannerRepository.remove(banner);
  }
}