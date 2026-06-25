import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CollaboratorAssignment } from './collaborator-assignment.entity';
import { User } from '../users/user.entity';
import { AppServiceEntity } from '../services/service.entity';

import { CollaboratorAssignmentsController } from './collaborator-assignments.controller';
import { CollaboratorAssignmentsService } from './collaborator-assignments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CollaboratorAssignment,
      User,
      AppServiceEntity,
    ]),
  ],
  controllers: [CollaboratorAssignmentsController],
  providers: [CollaboratorAssignmentsService],
  exports: [CollaboratorAssignmentsService, TypeOrmModule],
})
export class CollaboratorAssignmentsModule {}