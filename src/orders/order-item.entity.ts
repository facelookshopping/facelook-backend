import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, BaseEntity } from 'typeorm';
import { Order } from './order.entity';
import { ProductVariant } from 'src/products/entities/product-variant.entity';

@Entity()
export class OrderItem extends BaseEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  order: Order;

  // ✅ Link to the specific Variant (Size/Color)
  @ManyToOne(() => ProductVariant, { eager: true }) 
  variant: ProductVariant;

  @Column()
  productName: string; // Snapshot (in case product name changes)

  @Column({ nullable: true })
  size: string; // Snapshot

  @Column({ nullable: true })
  color: string; // Snapshot

  @Column('int')
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number; // Price at the time of purchase
}