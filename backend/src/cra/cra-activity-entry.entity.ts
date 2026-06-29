import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { CraActivityColumn } from './cra-activity-column.entity';
import { CraDay } from './cra-day.entity';
import { Cra } from './cra.entity';

@Entity('cra_activity_entries')
export class CraActivityEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Cra, (cra) => cra.activityEntries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cra_id' })
  cra: Cra;

  @ManyToOne(() => CraDay, (craDay) => craDay.activityEntries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cra_day_id' })
  craDay: CraDay;

  @ManyToOne(() => CraActivityColumn, (column) => column.entries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_column_id' })
  activityColumn: CraActivityColumn;

  @Column('decimal', { precision: 3, scale: 1 })
  duree: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}