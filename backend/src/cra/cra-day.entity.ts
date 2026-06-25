import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cra } from './cra.entity';

export enum CraDayType {
  TRAVAIL = 'TRAVAIL',
  CONGE = 'CONGE',
  ABSENCE = 'ABSENCE',
  RTT = 'RTT',
  FERIE = 'FERIE',
}

@Entity('cra_days')
export class CraDay {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Cra, (cra) => cra.days, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  cra: Cra;

  @Column({ type: 'date' })
  date: string;

  @Column({
    type: 'enum',
    enum: CraDayType,
  })
  type: CraDayType;

  @Column({ type: 'decimal', precision: 3, scale: 1 })
  duree: number;

  @Column({ type: 'text', nullable: true })
  commentaire: string;
}