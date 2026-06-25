import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../users/user.entity';
import { Service } from '../services/service.entity';

@Entity('collaborator_assignments')
export class CollaboratorAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'collaborator_id' })
  collaborator: User;

  @ManyToOne(() => Service, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'assigned_by_user_id' })
  assignedBy: User;

  @Column({ name: 'start_date', type: 'date', nullable: false })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}