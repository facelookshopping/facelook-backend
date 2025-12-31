import { Exclude } from 'class-transformer';
import { Address } from 'src/addresses/address.entity';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  FINANCE = 'finance',
  MARKETING = 'marketing',
  SUPPORT = 'support',
  USER = 'user',
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  name: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @OneToMany(() => Address, (address) => address.user)
  addresses: Address[]; 

  @Exclude()
  @Column({ nullable: true })
  password?: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}