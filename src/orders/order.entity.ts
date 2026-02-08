import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, BaseEntity } from 'typeorm';
import { OrderItem } from './order-item.entity';
import { OrderTimeline } from './order-timeline.entity';
import { User } from 'src/users/user.entity';
import { Address } from 'src/addresses/address.entity';
import { OrderStatus, PaymentType } from './order.enums';

@Entity()
export class Order extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  orderNumber: string;

  @ManyToOne(() => User, (user) => user.id, { eager: true, onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Address, { eager: true })
  shippingAddress: Address;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items: OrderItem[];

  // --- Financials ---
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  itemsTotal: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  shippingCost: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  // --- Status & Payment ---
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'enum', enum: PaymentType, default: PaymentType.ONLINE })
  paymentType: PaymentType;

  @Column({ nullable: true })
  paymentId: string;

  @Column({ nullable: true })
  merchantTransactionId: string;

  @Column({ nullable: true })
  estimatedDeliveryDate: Date;

  @OneToMany(() => OrderTimeline, (timeline) => timeline.order, { cascade: true, eager: true })
  timeline: OrderTimeline[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  deliveredAt: Date;
}

export { PaymentType, OrderStatus };
