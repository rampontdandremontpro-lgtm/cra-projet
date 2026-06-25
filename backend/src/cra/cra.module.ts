import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Cra } from './cra.entity';
import { CraDay } from './cra-day.entity';
import { User } from '../users/user.entity';

import { CraService } from './cra.service';
import { CraController } from './cra.controller';
import { PdfModule } from '../pdf/pdf.module';
import { AppServiceEntity } from '../services/service.entity';
import { CollaboratorAssignment } from '../collaborator-assignments/collaborator-assignment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cra,
      CraDay,
      User,
      AppServiceEntity,
      CollaboratorAssignment,
    ]),
    PdfModule,
  ],
  controllers: [CraController],
  providers: [CraService],
})
export class CraModule {}