import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, BaseEntity, JoinColumn } from 'typeorm';
import { Product } from '../product.entity';

@Entity()
export class ProductVariant extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  size: string;

  @Column()
  color: string;

  @Column('int')
  stock: number;

  @Column({ unique: true })
  sku: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  priceOverride: number;
  
  // Link back to Parent Product
  @ManyToOne(() => Product, (product) => product.variants, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'productId' }) // ✅ Link the relation to the column above
  product: Product;

  // ✅ ADD THIS: Explicitly define the Foreign Key Column
  // This is the magic fix for AdminJS to pre-select the correct product
  @Column({ nullable: true })
  productId: number;
}