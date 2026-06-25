import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

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

  @ManyToMany(() => User, (user) => user.clients)
  collaborateurs: User[];
}