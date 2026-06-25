import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AppServiceEntity } from '../services/service.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nom: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => AppServiceEntity, (service) => service.company)
  services: AppServiceEntity[];
}