import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cra } from '../cra/cra.entity';
import { Client } from '../clients/client.entity';
import { AppServiceEntity } from '../services/service.entity';

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

  @Column({ length: 100 })
  nom: string;

  @Column({ length: 100 })
  prenom: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Cra, (cra) => cra.collaborateur)
  cra: Cra[];

  @ManyToMany(() => Client, (client) => client.collaborateurs)
  @JoinTable({
    name: 'collaborateur_clients',
  })
  clients: Client[];

  @Column({
  type: 'enum',
  enum: ContractType,
  nullable: true,
})
contract_type: ContractType | null;

@Column({ nullable: true })
service_id: number | null;

@ManyToOne(() => AppServiceEntity, (service) => service.users, {
  nullable: true,
})
@JoinColumn({ name: 'service_id' })
service: AppServiceEntity | null;
}
