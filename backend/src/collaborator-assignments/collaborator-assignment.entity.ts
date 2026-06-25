import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../users/user.entity';
import { AppServiceEntity } from '../services/service.entity';

@Entity('collaborator_assignments')
export class CollaboratorAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  collaborateur_id: number;

  @Column()
  service_id: number;

  @Column()
  assigned_by_user_id: number;

  @Column({ type: 'date', nullable: true })
  start_date: Date | null;

  @Column({ type: 'date', nullable: true })
  end_date: Date | null;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'collaborateur_id' })
  collaborateur: User;

  @ManyToOne(() => AppServiceEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_id' })
  service: AppServiceEntity;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assigned_by_user_id' })
  assignedBy: User;
}