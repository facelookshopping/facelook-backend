import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './address.entity';
import { User } from '../users/user.entity';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
  ) {}

  async create(user: User, dto: CreateAddressDto): Promise<Address> {
    const count = await this.addressRepository.count({ where: { user: { id: user.id } } });
    if (count === 0) {
      dto.isDefault = true;
    }

    if (dto.isDefault) {
      await this.addressRepository.update({ user: { id: user.id } }, { isDefault: false });
    }

    const address = this.addressRepository.create({
      ...dto,
      user: { id: user.id },
    });

    return this.addressRepository.save(address);
  }

  async findAll(userId: number): Promise<Address[]> {
    return this.addressRepository.find({
      where: { user: { id: userId } },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  // ✅ ADDED THIS MISSING METHOD
  async findOne(addressId: number, userId: number): Promise<Address | null> {
    const address = await this.addressRepository.findOne({ 
      where: { id: addressId, user: { id: userId } } 
    });
    
    // We return null if not found so the caller (OrderService) can handle the error
    return address;
  }

  async setDefault(userId: number, addressId: number): Promise<void> {
    const address = await this.findOne(addressId, userId); // Reuse the method above
    
    if (!address) throw new NotFoundException('Address not found');

    await this.addressRepository.update({ user: { id: userId } }, { isDefault: false });

    address.isDefault = true;
    await this.addressRepository.save(address);
  }
  
  async delete(userId: number, addressId: number): Promise<void> {
    await this.addressRepository.delete({ id: addressId, user: { id: userId } });
  }
}