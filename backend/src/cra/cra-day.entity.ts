import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Cra } from './cra.entity';

export enum CraDayType {
  TRAVAIL = 'TRAVAIL',
  CONGE = 'CONGE',
  ABSENCE = 'ABSENCE',
  RTT = 'RTT',
}

@Entity('cra_days')
export class CraDay {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Cra, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cra_id' })
  cra: Cra;

  @Column({ type: 'date', nullable: false })
  date: string;

  @Column({
    type: 'enum',
    enum: CraDayType,
    nullable: false,
  })
  type: CraDayType;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 1,
    nullable: false,
  })
  duree: number;

  @Column({ type: 'text', nullable: true })
  commentaire: string | null;
}