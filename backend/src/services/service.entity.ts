import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';

@Entity('services')
export class AppServiceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  company_id: number;

  @Column({ length: 150 })
  nom: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Company, (company) => company.services, {
    onDelete: 'CASCADE',
  })
  company: Company;

  @OneToMany(() => User, (user) => user.service)
  users: User[];
}