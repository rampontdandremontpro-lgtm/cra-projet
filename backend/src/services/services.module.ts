import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppServiceEntity } from './service.entity';
import { Company } from '../companies/company.entity';

import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppServiceEntity,
      Company,
    ]),
  ],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService, TypeOrmModule],
})
export class ServicesModule {}