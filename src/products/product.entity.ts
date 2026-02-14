import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, BaseEntity } from 'typeorm';
import { ProductVariant } from './entities/product-variant.entity';

export enum Gender {
  MEN = 'MEN',
  WOMEN = 'WOMEN',
  UNISEX = 'UNISEX',
  KIDS = 'KIDS',
}

@Entity()
export class Product extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('int', { default: 0 })
  stock: number;

  @Column({ type: 'enum', enum: Gender, default: Gender.UNISEX })
  gender: Gender;

  @Column({ length: 100 })
  category: string; // e.g., "Shirts", "Jeans"

  @Column({ length: 100 })
  brand: string;

  @OneToMany(() => ProductVariant, (variant) => variant.product, {
    cascade: true,
  })
  variants: ProductVariant[];

  // Stores colors like: "Red,Blue,Black"
  @Column('simple-array', { nullable: true })
  colors: string[];

  // Stores image URLs
  @Column('simple-array', { nullable: true })
  images: string[];

  @Column({ default: false })
  isTrending: boolean;

  @Column({ default: false })
  isArchived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  ownerId: number;
}