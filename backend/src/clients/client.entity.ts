import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cra } from '../cra/cra.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nom: string;

  @Column({ length: 150, nullable: true })
  contact_nom: string;

  @Column({ length: 150, nullable: true })
  contact_email: string;

  @Column({ length: 150, nullable: true })
  email_validation: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Cra, (cra) => cra.client)
  cra: Cra[];
}