import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Service } from './service.entity';
import { Company } from '../companies/company.entity';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Service, Company])],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [TypeOrmModule, ServicesService],
})
export class ServicesModule {}