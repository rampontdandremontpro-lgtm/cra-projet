import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Service } from '../services/service.entity';
import { User } from '../users/user.entity';
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

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'collaborateur_id' })
  collaborateur: User;

  @ManyToOne(() => Service, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @Column({ type: 'int', nullable: false })
  mois: number;

  @Column({ type: 'int', nullable: false })
  annee: number;

  @Column({
    type: 'enum',
    enum: CraStatus,
    nullable: false,
    default: CraStatus.BROUILLON,
  })
  statut: CraStatus;

  @Column({ name: 'date_soumission', type: 'datetime', nullable: true })
  dateSoumission: Date | null;

  @Column({ name: 'date_validation_client', type: 'datetime', nullable: true })
  dateValidationClient: Date | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'client_validator_id' })
  clientValidator: User | null;

  @Column({ name: 'date_refus_client', type: 'datetime', nullable: true })
  dateRefusClient: Date | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'client_refuser_id' })
  clientRefuser: User | null;

  @Column({ name: 'motif_refus_client', type: 'text', nullable: true })
  motifRefusClient: string | null;

  @Column({ name: 'date_validation_admin', type: 'datetime', nullable: true })
  dateValidationAdmin: Date | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'admin_validator_id' })
  adminValidator: User | null;

  @Column({ name: 'date_refus_admin', type: 'datetime', nullable: true })
  dateRefusAdmin: Date | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'admin_refuser_id' })
  adminRefuser: User | null;

  @Column({ name: 'motif_refus_admin', type: 'text', nullable: true })
  motifRefusAdmin: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @OneToMany(() => CraDay, (day) => day.cra)
  days: CraDay[];
}