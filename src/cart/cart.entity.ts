import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, Unique, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';

@Entity()
// ⚠️ CRITICAL: Unique constraint now includes size and color.
// This prevents duplicate rows for the exact same variation, but allows different variations.
@Unique(['user', 'product', 'size', 'color']) 
export class Cart {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Product, (product) => product.id, { eager: true, onDelete: 'CASCADE' })
  product: Product;

  @Column('int')
  quantity: number;

  @Column({ nullable: true })
  size: string;

  @Column({ nullable: true })
  color: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}