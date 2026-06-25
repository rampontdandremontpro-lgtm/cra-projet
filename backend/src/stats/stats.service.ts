import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Company } from '../companies/company.entity';
import { CraDay, CraDayType } from '../cra/cra-day.entity';
import { Cra, CraStatus } from '../cra/cra.entity';
import { Service } from '../services/service.entity';
import { User, ContractType, UserRole } from '../users/user.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,

    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,

    @InjectRepository(Cra)
    private readonly craRepository: Repository<Cra>,

    @InjectRepository(CraDay)
    private readonly craDaysRepository: Repository<CraDay>,
  ) {}

  async getAdminStats() {
    const totalCollaborateurs = await this.usersRepository.count({
      where: {
        role: UserRole.COLLABORATEUR,
        isActive: true,
      },
    });

    const totalClients = await this.usersRepository.count({
      where: {
        role: UserRole.CLIENT,
        isActive: true,
      },
    });

    const totalRh = await this.usersRepository.count({
      where: {
        role: UserRole.RH,
        isActive: true,
      },
    });

    const totalCompanies = await this.companiesRepository.count({
      where: {
        isActive: true,
      },
    });

    const totalServices = await this.servicesRepository.count();

    const totalCra = await this.craRepository.count();

    const craByStatus = await Promise.all(
      Object.values(CraStatus).map(async (status) => ({
        status,
        total: await this.craRepository.count({
          where: {
            statut: status,
          },
        }),
      })),
    );

    return {
      totalCollaborateurs,
      totalClients,
      totalRh,
      totalCompanies,
      totalServices,
      totalCra,
      craByStatus,
    };
  }

  async getRhStats() {
    const totalCollaborateurs = await this.usersRepository.count({
      where: {
        role: UserRole.COLLABORATEUR,
        isActive: true,
      },
    });

    const collaborateursByContract = await Promise.all(
      Object.values(ContractType).map(async (contractType) => ({
        contractType,
        total: await this.usersRepository.count({
          where: {
            role: UserRole.COLLABORATEUR,
            contractType,
            isActive: true,
          },
        }),
      })),
    );

    const totalConges = await this.craDaysRepository
      .createQueryBuilder('day')
      .where('day.type = :type', { type: CraDayType.CONGE })
      .select('SUM(day.duree)', 'total')
      .getRawOne();

    const totalAbsences = await this.craDaysRepository
      .createQueryBuilder('day')
      .where('day.type = :type', { type: CraDayType.ABSENCE })
      .select('SUM(day.duree)', 'total')
      .getRawOne();

    const totalRtt = await this.craDaysRepository
      .createQueryBuilder('day')
      .where('day.type = :type', { type: CraDayType.RTT })
      .select('SUM(day.duree)', 'total')
      .getRawOne();

    const craByStatus = await Promise.all(
      Object.values(CraStatus).map(async (status) => ({
        status,
        total: await this.craRepository.count({
          where: {
            statut: status,
          },
        }),
      })),
    );

    return {
      totalCollaborateurs,
      collaborateursByContract,
      totalConges: Number(totalConges.total) || 0,
      totalAbsences: Number(totalAbsences.total) || 0,
      totalRtt: Number(totalRtt.total) || 0,
      craByStatus,
    };
  }
}