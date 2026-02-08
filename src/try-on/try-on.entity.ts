import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, BaseEntity, JoinColumn } from 'typeorm';
import { User } from 'src/users/user.entity';
import { Product } from 'src/products/product.entity'; // ✅ Import Product

@Entity()
export class TryOn extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  user: User;

  // ✅ NEW: Link to the Product ID for "View Original Product" functionality
  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ default: 'REFERENCE' })
  type: 'REFERENCE' | 'GENERATED';

  @Column({ default: 'COMPLETED' }) 
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';

  @Column({ nullable: true })
  requestId: string;

  @Column('text', { array: true, default: '{}' })
  imageUrls: string[];

  @Column('text', { array: true, nullable: true })
  garmentUrls: string[];

  @Column({ nullable: true })
  category: string;

  @CreateDateColumn()
  createdAt: Date;
}