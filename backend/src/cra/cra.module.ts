import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Cra } from './cra.entity';
import { CraDay } from './cra-day.entity';
import { User } from '../users/user.entity';
import { Client } from '../clients/client.entity';

import { CraService } from './cra.service';
import { CraController } from './cra.controller';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cra,
      CraDay,
      User,
      Client,
    ]),
    PdfModule,
  ],
  controllers: [CraController],
  providers: [CraService],
})
export class CraModule {}