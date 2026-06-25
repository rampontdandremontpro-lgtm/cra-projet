import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CollaboratorAssignment } from './collaborator-assignment.entity';
import { User } from '../users/user.entity';
import { Service } from '../services/service.entity';
import { CollaboratorAssignmentsService } from './collaborator-assignments.service';
import { CollaboratorAssignmentsController } from './collaborator-assignments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CollaboratorAssignment, User, Service])],
  controllers: [CollaboratorAssignmentsController],
  providers: [CollaboratorAssignmentsService],
  exports: [TypeOrmModule, CollaboratorAssignmentsService],
})
export class CollaboratorAssignmentsModule {}