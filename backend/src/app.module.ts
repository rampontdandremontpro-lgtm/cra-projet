import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { CraModule } from './cra/cra.module';
import { HolidaysModule } from './holidays/holidays.module';
import { AuthModule } from './auth/auth.module';
import { PdfModule } from './pdf/pdf.module';
import { StatsModule } from './stats/stats.module';
import { CompaniesModule } from './companies/companies.module';
import { ServicesModule } from './services/services.module';
import { CollaboratorAssignmentsModule } from './collaborator-assignments/collaborator-assignments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      autoLoadEntities: true,
      synchronize: true,
    }),

    UsersModule,
    ClientsModule,
    CraModule,
    HolidaysModule,
    AuthModule,
    PdfModule,
    StatsModule,
    CompaniesModule,
    ServicesModule,
    CollaboratorAssignmentsModule,
  ],
})
export class AppModule {}