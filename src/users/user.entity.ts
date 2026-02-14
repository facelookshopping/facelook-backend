import { Exclude } from 'class-transformer';
import { Address } from '../addresses/address.entity';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, BaseEntity } from 'typeorm';
import { Order } from 'src/orders/order.entity';

export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  FINANCE = 'finance',
  MARKETING = 'marketing',
  SUPPORT = 'support',
  USER = 'user',
}

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // ✅ FIX 1: Explicitly set type: 'varchar'
  @Column({ type: 'varchar', unique: true, nullable: true })
  phoneNumber?: string | null; // Supports string or null

  @Column({ nullable: true })
  name: string;

  // ✅ FIX 2: Explicitly set type: 'varchar' here too just in case
  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string;

  @OneToMany(() => Address, (address) => address.user)
  addresses: Address[];

  @Exclude()
  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  profilePicture: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  fcmToken: string;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  currentHashedRefreshToken?: string | null;
  profileImage: any;
}