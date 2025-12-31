import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { OrderItem } from './order-item.entity';
import { User } from 'src/users/user.entity';
import { Address } from 'src/addresses/address.entity';

export enum OrderStatus {
  PENDING = 'Pending',       // Payment not done
  PAID = 'Paid',             // Payment done, waiting for packing
  PROCESSING = 'Processing', // Admin is packing it
  SHIPPED = 'Shipped',       // Handed to courier
  DELIVERED = 'Delivered',   // Customer got it
  CANCELLED = 'Cancelled',   // User or Admin cancelled
}

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  // ✅ Generated readable ID for customers (e.g., "ORD-123456")
  @Column({ unique: true })
  orderNumber: string;

  @ManyToOne(() => User, (user) => user.id, { eager: true })
  user: User;

  @ManyToOne(() => Address, { eager: true })
  shippingAddress: Address;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items: OrderItem[];

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  // Payment Info
  @Column({ nullable: true })
  paymentId: string;

  @Column({ nullable: true })
  merchantTransactionId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}