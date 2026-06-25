import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Company } from '../companies/company.entity';
import { Cra } from '../cra/cra.entity';
import { CraDay } from '../cra/cra-day.entity';
import { Service } from '../services/service.entity';
import { User } from '../users/user.entity';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Company, Service, Cra, CraDay])],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}