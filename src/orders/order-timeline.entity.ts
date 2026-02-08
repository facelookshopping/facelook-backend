import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, BaseEntity } from 'typeorm';
import { Order } from './order.entity';
import { OrderStatus } from './order.enums'; // ✅ Import from new file

@Entity()
export class OrderTimeline extends BaseEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.timeline, { onDelete: 'CASCADE' })
  order: Order;

  @Column({ type: 'enum', enum: OrderStatus })
  status: OrderStatus;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  timestamp: Date;
}