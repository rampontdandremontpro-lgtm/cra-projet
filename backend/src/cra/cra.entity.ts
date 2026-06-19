import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Client } from '../clients/client.entity';
import { CraDay } from './cra-day.entity';

export enum CraStatus {
  BROUILLON = 'BROUILLON',
  SOUMIS_CLIENT = 'SOUMIS_CLIENT',
  REFUSE_CLIENT = 'REFUSE_CLIENT',
  VALIDE_CLIENT = 'VALIDE_CLIENT',
  REFUSE_ADMIN = 'REFUSE_ADMIN',
  VALIDE_ADMIN = 'VALIDE_ADMIN',
  ARCHIVE = 'ARCHIVE',
}

@Entity('cra')
export class Cra {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.cra, { nullable: false })
  collaborateur: User;

  @ManyToOne(() => Client, (client) => client.cra, { nullable: false })
  client: Client;

  @Column()
  mois: number;

  @Column()
  annee: number;

  @Column({
    type: 'enum',
    enum: CraStatus,
    default: CraStatus.BROUILLON,
  })
  statut: CraStatus;

  @Column({ type: 'datetime', nullable: true })
  date_soumission: Date;

  @Column({ type: 'datetime', nullable: true })
  date_validation_client: Date;

  @Column({ type: 'datetime', nullable: true })
  date_refus_client: Date;

  @Column({ type: 'text', nullable: true })
  motif_refus_client: string;

  @Column({ type: 'datetime', nullable: true })
  date_validation_admin: Date;

  @Column({ type: 'datetime', nullable: true })
  date_refus_admin: Date;

  @Column({ type: 'text', nullable: true })
  motif_refus_admin: string;

  @OneToMany(() => CraDay, (craDay) => craDay.cra, {
    cascade: true,
  })
  jours: CraDay[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}