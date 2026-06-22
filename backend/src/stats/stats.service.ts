import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { User, UserRole } from '../users/user.entity';
import { Client } from '../clients/client.entity';
import { Cra, CraStatus } from '../cra/cra.entity';
import { CraDay, CraDayType } from '../cra/cra-day.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,

    @InjectRepository(Cra)
    private readonly craRepository: Repository<Cra>,

    @InjectRepository(CraDay)
    private readonly craDayRepository: Repository<CraDay>,
  ) {}

  async getDashboardStats() {
    const totalCollaborateurs = await this.usersRepository.count({
      where: { role: UserRole.COLLABORATEUR },
    });

    const totalClients = await this.clientsRepository.count();

    const totalCra = await this.craRepository.count();

    const craBrouillons = await this.craRepository.count({
      where: { statut: CraStatus.BROUILLON },
    });

    const craSoumisClient = await this.craRepository.count({
      where: { statut: CraStatus.SOUMIS_CLIENT },
    });

    const craValidesClient = await this.craRepository.count({
      where: { statut: CraStatus.VALIDE_CLIENT },
    });

    const craValidesAdmin = await this.craRepository.count({
      where: { statut: CraStatus.VALIDE_ADMIN },
    });

    const craRefuses = await this.craRepository.count({
      where: {
        statut: In([CraStatus.REFUSE_CLIENT, CraStatus.REFUSE_ADMIN]),
      },
    });

    const totalConges = await this.craDayRepository
      .createQueryBuilder('day')
      .select('SUM(day.duree)', 'total')
      .where('day.type = :type', { type: CraDayType.CONGE })
      .getRawOne();

    const totalAbsences = await this.craDayRepository
      .createQueryBuilder('day')
      .select('SUM(day.duree)', 'total')
      .where('day.type = :type', { type: CraDayType.ABSENCE })
      .getRawOne();

    return {
      totalCollaborateurs,
      totalClients,
      totalCra,
      craBrouillons,
      craSoumisClient,
      craValidesClient,
      craValidesAdmin,
      craRefuses,
      totalConges: Number(totalConges.total ?? 0),
      totalAbsences: Number(totalAbsences.total ?? 0),
    };
  }
}