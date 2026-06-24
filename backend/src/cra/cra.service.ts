import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Cra, CraStatus } from './cra.entity';
import { CraDay } from './cra-day.entity';
import { User } from '../users/user.entity';
import { Client } from '../clients/client.entity';

import { CreateCraDto } from './dto/create-cra.dto';
import { UpdateCraDto } from './dto/update-cra.dto';
import { PdfService } from '../pdf/pdf.service';

type CraDayInput = {
  date: string;
  type: string;
  duree: number;
  commentaire?: string;
};

const DECLARABLE_DAY_TYPES = ['TRAVAIL', 'CONGE', 'ABSENCE', 'RTT'];

@Injectable()
export class CraService {
  constructor(
    @InjectRepository(Cra)
    private readonly craRepository: Repository<Cra>,

    @InjectRepository(CraDay)
    private readonly craDayRepository: Repository<CraDay>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,

    private readonly pdfService: PdfService,
  ) {}

  private async getCollaborateur(userId: number): Promise<User> {
    const collaborateur = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!collaborateur) {
      throw new NotFoundException('Collaborateur introuvable');
    }

    return collaborateur;
  }

  private async getClient(clientId: number): Promise<Client> {
    const client = await this.clientsRepository.findOne({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Client introuvable');
    }

    return client;
  }

  private async ensureClientAssignedToCollaborateur(
    collaborateurId: number,
    clientId: number,
  ): Promise<void> {
    const collaborateur = await this.usersRepository.findOne({
      where: { id: collaborateurId },
      relations: {
        clients: true,
      },
    });

    if (!collaborateur) {
      throw new NotFoundException('Collaborateur introuvable');
    }

    const isAssigned = collaborateur.clients.some(
      (client) => client.id === clientId,
    );

    if (!isAssigned) {
      throw new BadRequestException(
        'Ce client n’est pas assigné à ce collaborateur.',
      );
    }
  }

  private async getMartiniqueHolidays(annee: number): Promise<string[]> {
    const response = await fetch(
      'https://calendrier.api.gouv.fr/jours-feries/martinique.json',
    );

    const holidays = await response.json();

    return Object.keys(holidays).filter((date) =>
      date.startsWith(String(annee)),
    );
  }

  private validateCraYear(annee: number): void {
    const currentYear = new Date().getFullYear();

    if (!Number.isInteger(annee) || String(annee).length !== 4) {
      throw new BadRequestException(
        "L'année du CRA doit contenir exactement 4 chiffres.",
      );
    }

    if (annee !== currentYear) {
      throw new BadRequestException(
        `L'année du CRA doit être ${currentYear}.`,
      );
    }
  }

  private async validateCraDaysDates(
    jours: CraDayInput[],
    mois: number,
    annee: number,
  ): Promise<void> {
    this.validateCraYear(annee);

    const holidays = await this.getMartiniqueHolidays(annee);

    for (const jour of jours || []) {
      if (!jour.date) continue;

      const [year, month, day] = jour.date.split('-').map(Number);

      if (year !== annee) {
        throw new BadRequestException(
          `La date ${jour.date} ne correspond pas à l'année du CRA.`,
        );
      }

      if (month !== mois) {
        throw new BadRequestException(
          `La date ${jour.date} ne correspond pas au mois du CRA.`,
        );
      }

      const date = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = date.getUTCDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        throw new BadRequestException(
          `La date ${jour.date} est un week-end et ne peut pas être déclarée dans le CRA.`,
        );
      }

      if (holidays.includes(jour.date)) {
        throw new BadRequestException(
          `La date ${jour.date} est un jour férié et ne peut pas être déclarée dans le CRA.`,
        );
      }
    }
  }

  private async calculateWorkingDays(
    mois: number,
    annee: number,
  ): Promise<number> {
    let workingDays = 0;

    const holidays = await this.getMartiniqueHolidays(annee);
    const daysInMonth = new Date(annee, mois, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(Date.UTC(annee, mois - 1, day));
      const dayOfWeek = date.getUTCDay();
      const formattedDate = date.toISOString().split('T')[0];

      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidays.includes(formattedDate);

      if (!isWeekend && !isHoliday) {
        workingDays++;
      }
    }

    return workingDays;
  }

  private calculateDeclaredDaysFromDays(jours: CraDayInput[]): number {
    return (jours || [])
      .filter((jour) => DECLARABLE_DAY_TYPES.includes(jour.type))
      .reduce((total, jour) => total + Number(jour.duree), 0);
  }

  private calculateDeclaredDays(cra: Cra): number {
    return this.calculateDeclaredDaysFromDays(cra.jours);
  }

  private async validateCraCoherence(
    jours: CraDayInput[],
    mois: number,
    annee: number,
  ): Promise<{
    declaredDays: number;
    workingDays: number;
  }> {
    await this.validateCraDaysDates(jours, mois, annee);

    const workingDays = await this.calculateWorkingDays(mois, annee);
    const declaredDays = this.calculateDeclaredDaysFromDays(jours);

    if (declaredDays !== workingDays) {
      throw new BadRequestException(
        `CRA incohérent : ${declaredDays} jour(s) déclaré(s) pour ${workingDays} jour(s) ouvré(s).`,
      );
    }

    return {
      declaredDays,
      workingDays,
    };
  }

  async generatePdf(id: number): Promise<Buffer> {
    const cra = await this.findOne(id);
    return this.pdfService.generateCraPdf(cra);
  }

  async create(createCraDto: CreateCraDto, userId: number): Promise<Cra> {
    await this.validateCraDaysDates(
      createCraDto.jours || [],
      createCraDto.mois,
      createCraDto.annee,
    );

    const collaborateur = await this.getCollaborateur(userId);
    const client = await this.getClient(createCraDto.client_id);

    await this.ensureClientAssignedToCollaborateur(
      collaborateur.id,
      client.id,
    );

    const cra = this.craRepository.create({
      collaborateur,
      client,
      mois: createCraDto.mois,
      annee: createCraDto.annee,
      jours: createCraDto.jours?.map((jour) =>
        this.craDayRepository.create(jour),
      ),
    });

    return this.craRepository.save(cra);
  }

  findAll(): Promise<Cra[]> {
    return this.craRepository.find({
      relations: {
        collaborateur: true,
        client: true,
        jours: true,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  findByCollaborateur(userId: number): Promise<Cra[]> {
    return this.craRepository.find({
      where: {
        collaborateur: {
          id: userId,
        },
      },
      relations: {
        collaborateur: true,
        client: true,
        jours: true,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findOne(id: number): Promise<Cra> {
    const cra = await this.craRepository.findOne({
      where: { id },
      relations: {
        collaborateur: true,
        client: true,
        jours: true,
      },
    });

    if (!cra) {
      throw new NotFoundException('CRA introuvable');
    }

    return cra;
  }

  async findOneForUser(id: number, userId: number): Promise<Cra> {
  const cra = await this.findOne(id);

  if (cra.collaborateur.id !== userId) {
    throw new NotFoundException('CRA introuvable');
  }

  return cra;
}

  async update(id: number, updateCraDto: UpdateCraDto): Promise<Cra> {
    const cra = await this.findOne(id);

    const mois = updateCraDto.mois ?? cra.mois;
    const annee = updateCraDto.annee ?? cra.annee;

    if (updateCraDto.jours) {
      await this.validateCraDaysDates(updateCraDto.jours, mois, annee);
    }

    if (updateCraDto.collaborateur_id) {
      cra.collaborateur = await this.getCollaborateur(
        updateCraDto.collaborateur_id,
      );
    }

    if (updateCraDto.client_id) {
      cra.client = await this.getClient(updateCraDto.client_id);
    }

    if (updateCraDto.mois !== undefined) cra.mois = updateCraDto.mois;
    if (updateCraDto.annee !== undefined) cra.annee = updateCraDto.annee;
    if (updateCraDto.statut !== undefined) cra.statut = updateCraDto.statut;

    if (updateCraDto.jours) {
      await this.craDayRepository.delete({ cra: { id: cra.id } });

      cra.jours = updateCraDto.jours.map((jour) =>
        this.craDayRepository.create(jour),
      );
    }

    return this.craRepository.save(cra);
  }

  async updateForUser(
  id: number,
  updateCraDto: UpdateCraDto,
  userId: number,
): Promise<Cra> {
  await this.findOneForUser(id, userId);

  return this.update(id, updateCraDto);
}

  async submit(id: number): Promise<Cra> {
    const cra = await this.findOne(id);

    if (
      cra.statut !== CraStatus.BROUILLON &&
      cra.statut !== CraStatus.REFUSE_CLIENT &&
      cra.statut !== CraStatus.REFUSE_ADMIN
    ) {
      throw new BadRequestException('Ce CRA ne peut pas être soumis');
    }

    await this.validateCraCoherence(cra.jours || [], cra.mois, cra.annee);

    cra.statut = CraStatus.SOUMIS_CLIENT;
    cra.date_soumission = new Date();

    return this.craRepository.save(cra);
  }

  async checkCraBeforeSubmit(createCraDto: CreateCraDto) {
    const result = await this.validateCraCoherence(
      createCraDto.jours || [],
      createCraDto.mois,
      createCraDto.annee,
    );

    return {
      message: 'CRA cohérent',
      ...result,
    };
  }

  async validateClient(id: number): Promise<Cra> {
    const cra = await this.findOne(id);

    if (cra.statut !== CraStatus.SOUMIS_CLIENT) {
      throw new BadRequestException(
        'Ce CRA doit être soumis au client avant validation',
      );
    }

    cra.statut = CraStatus.VALIDE_CLIENT;
    cra.date_validation_client = new Date();

    return this.craRepository.save(cra);
  }

  async refuseClient(id: number, motif: string): Promise<Cra> {
    const cra = await this.findOne(id);

    if (cra.statut !== CraStatus.SOUMIS_CLIENT) {
      throw new BadRequestException(
        'Ce CRA ne peut pas être refusé par le client',
      );
    }

    if (!motif || motif.trim() === '') {
      throw new BadRequestException('Le motif de refus client est obligatoire');
    }

    cra.statut = CraStatus.REFUSE_CLIENT;
    cra.date_refus_client = new Date();
    cra.motif_refus_client = motif;

    return this.craRepository.save(cra);
  }

  async validateAdmin(id: number): Promise<Cra> {
    const cra = await this.findOne(id);

    if (cra.statut !== CraStatus.VALIDE_CLIENT) {
      throw new BadRequestException(
        'Ce CRA doit être validé par le client avant validation admin',
      );
    }

    cra.statut = CraStatus.VALIDE_ADMIN;
    cra.date_validation_admin = new Date();

    return this.craRepository.save(cra);
  }

  async refuseAdmin(id: number, motif: string): Promise<Cra> {
    const cra = await this.findOne(id);

    if (cra.statut !== CraStatus.VALIDE_CLIENT) {
      throw new BadRequestException(
        'Ce CRA ne peut pas être refusé par l’administrateur',
      );
    }

    if (!motif || motif.trim() === '') {
      throw new BadRequestException(
        'Le motif de refus administrateur est obligatoire',
      );
    }

    cra.statut = CraStatus.REFUSE_ADMIN;
    cra.date_refus_admin = new Date();
    cra.motif_refus_admin = motif;

    return this.craRepository.save(cra);
  }

  async removeForUser(id: number, userId: number): Promise<void> {
  const cra = await this.findOneForUser(id, userId);

  await this.craRepository.remove(cra);
}
}