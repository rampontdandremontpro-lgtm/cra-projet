import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { CraActivityEntry } from './cra-activity-entry.entity';
import { Cra } from './cra.entity';

@Entity('cra_activity_columns')
export class CraActivityColumn {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Cra, (cra) => cra.activityColumns, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cra_id' })
  cra: Cra;

  @Column()
  nom: string;

  @Column({ name: 'order_index', default: 0 })
  orderIndex: number;

  @OneToMany(() => CraActivityEntry, (entry) => entry.activityColumn)
  entries: CraActivityEntry[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}