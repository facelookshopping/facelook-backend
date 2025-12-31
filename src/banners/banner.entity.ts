import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Banner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string; // e.g. "Roots & Reflections"

  @Column({ nullable: true })
  subtitle: string; // e.g. "New Wedding Collection"

  @Column()
  imageUrl: string; // URL from your cloud storage (S3/Cloudinary)

  @Column({ default: '/' })
  redirectUrl: string; // e.g. "/category/men" or "/products/105"

  @Column({ default: true })
  isActive: boolean; // Toggle to hide/show without deleting

  @Column('int', { default: 0 })
  displayOrder: number; // To sort sliders (1, 2, 3)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}