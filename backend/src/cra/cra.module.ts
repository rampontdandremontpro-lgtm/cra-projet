import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CollaboratorAssignment } from '../collaborator-assignments/collaborator-assignment.entity';
import { Holiday } from '../holidays/holiday.entity';
import { PdfModule } from '../pdf/pdf.module';
import { Service } from '../services/service.entity';
import { User } from '../users/user.entity';
import { CraDay } from './cra-day.entity';
import { Cra } from './cra.entity';
import { CraController } from './cra.controller';
import { CraService } from './cra.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cra,
      CraDay,
      User,
      Service,
      CollaboratorAssignment,
      Holiday,
    ]),
    PdfModule,
  ],
  controllers: [CraController],
  providers: [CraService],
  exports: [TypeOrmModule, CraService],
})
export class CraModule {}