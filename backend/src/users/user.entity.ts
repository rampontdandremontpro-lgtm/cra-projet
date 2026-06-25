import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Service } from '../services/service.entity';

export enum UserRole {
  COLLABORATEUR = 'COLLABORATEUR',
  CLIENT = 'CLIENT',
  RH = 'RH',
  ADMIN = 'ADMIN',
}

export enum ContractType {
  CDI = 'CDI',
  CDD = 'CDD',
  FREELANCE = 'FREELANCE',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, nullable: false })
  nom: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  prenom: string;

  @Column({ type: 'varchar', length: 150, unique: true, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    nullable: false,
  })
  role: UserRole;

  @Column({
    name: 'contract_type',
    type: 'enum',
    enum: ContractType,
    nullable: true,
  })
  contractType: ContractType | null;

  @ManyToOne(() => Service, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'service_id' })
  service: Service | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}