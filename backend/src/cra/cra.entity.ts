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
import { CraDay } from './cra-day.entity';
import { AppServiceEntity } from '../services/service.entity';

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

  @Column()
  collaborateur_id: number;

  @ManyToOne(() => User, (user) => user.cra, {
    nullable: false,
  })
  collaborateur: User;

  @Column()
  service_id: number;

  @ManyToOne(() => AppServiceEntity, {
    nullable: false,
  })
  service: AppServiceEntity;

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
  date_soumission: Date | null;

  @Column({ type: 'datetime', nullable: true })
  date_validation_client: Date | null;

  @Column({ type: 'int', nullable: true })
client_validator_id: number | null;

  @ManyToOne(() => User, { nullable: true })
  client_validator: User | null;

  @Column({ type: 'datetime', nullable: true })
  date_refus_client: Date | null;

  @Column({ type: 'int', nullable: true })
  client_refuser_id: number | null;

  @ManyToOne(() => User, { nullable: true })
  client_refuser: User | null;

  @Column({ type: 'text', nullable: true })
  motif_refus_client: string | null;

  @Column({ type: 'datetime', nullable: true })
  date_validation_admin: Date | null;

  @Column({ type: 'int', nullable: true })
admin_validator_id: number | null;

  @ManyToOne(() => User, { nullable: true })
  admin_validator: User | null;

  @Column({ type: 'datetime', nullable: true })
  date_refus_admin: Date | null;

  @Column({ type: 'int', nullable: true })
admin_refuser_id: number | null;

  @ManyToOne(() => User, { nullable: true })
  admin_refuser: User | null;

  @Column({ type: 'text', nullable: true })
  motif_refus_admin: string | null;

  @OneToMany(() => CraDay, (day) => day.cra, {
    cascade: true,
  })
  days: CraDay[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}