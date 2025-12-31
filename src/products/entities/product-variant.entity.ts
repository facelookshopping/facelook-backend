import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Product } from '../product.entity';

@Entity()
export class ProductVariant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  size: string; // e.g. "S", "M", "42"

  @Column()
  color: string; // e.g. "Red", "Blue"

  @Column('int')
  stock: number; // ✅ Real stock is tracked here

  @Column({ unique: true })
  sku: string; // Unique ID (e.g. "NIKE-RED-S")

  // Optional: If XL costs more than S, set this. Otherwise null.
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  priceOverride: number; 

  // Link back to Parent Product
  @ManyToOne(() => Product, (product) => product.variants, { onDelete: 'CASCADE' })
  product: Product;
}