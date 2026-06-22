import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';

import { User } from '../users/user.entity';
import { Client } from '../clients/client.entity';
import { Cra } from '../cra/cra.entity';
import { CraDay } from '../cra/cra-day.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Client, Cra, CraDay])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}