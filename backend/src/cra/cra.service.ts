import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Cra, CraStatus } from './cra.entity';
import { CraDay } from './cra-day.entity';
import { User } from '../users/user.entity';
import { Client } from '../clients/client.entity';

import { CreateCraDto } from './dto/create-cra.dto';
import { UpdateCraDto } from './dto/update-cra.dto';
import { PdfService } from '../pdf/pdf.service';

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

  private async getMartiniqueHolidays(annee: number): Promise<string[]> {
  const response = await fetch(
    'https://calendrier.api.gouv.fr/jours-feries/martinique.json',
  );

  const holidays = await response.json();

  return Object.keys(holidays).filter((date) =>
    date.startsWith(String(annee)),
  );
}

  private async calculateWorkingDays(mois: number, annee: number): Promise<number> {
  let workingDays = 0;

  const holidays = await this.getMartiniqueHolidays(annee);
  const daysInMonth = new Date(annee, mois, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(annee, mois - 1, day);
    const dayOfWeek = date.getDay();

    const formattedDate = date.toISOString().split('T')[0];

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidays.includes(formattedDate);

    if (!isWeekend && !isHoliday) {
      workingDays++;
    }
  }

  return workingDays;
}

private calculateDeclaredDays(cra: Cra): number {
  return cra.jours
    .filter((jour) =>
      ['TRAVAIL', 'CONGE', 'ABSENCE', 'RTT'].includes(jour.type),
    )
    .reduce((total, jour) => total + Number(jour.duree), 0);
}

  async generatePdf(id: number): Promise<Buffer> {
  const cra = await this.findOne(id);
  return this.pdfService.generateCraPdf(cra);
}

  async create(createCraDto: CreateCraDto): Promise<Cra> {
    const collaborateur = await this.usersRepository.findOne({
      where: { id: createCraDto.collaborateur_id },
    });

    if (!collaborateur) {
      throw new NotFoundException('Collaborateur introuvable');
    }

    const client = await this.clientsRepository.findOne({
      where: { id: createCraDto.client_id },
    });

    if (!client) {
      throw new NotFoundException('Client introuvable');
    }

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

  async update(id: number, updateCraDto: UpdateCraDto): Promise<Cra> {
    const cra = await this.findOne(id);

    if (updateCraDto.collaborateur_id) {
      const collaborateur = await this.usersRepository.findOne({
        where: { id: updateCraDto.collaborateur_id },
      });

      if (!collaborateur) {
        throw new NotFoundException('Collaborateur introuvable');
      }

      cra.collaborateur = collaborateur;
    }

    if (updateCraDto.client_id) {
      const client = await this.clientsRepository.findOne({
        where: { id: updateCraDto.client_id },
      });

      if (!client) {
        throw new NotFoundException('Client introuvable');
      }

      cra.client = client;
    }

    if (updateCraDto.mois !== undefined) {
      cra.mois = updateCraDto.mois;
    }

    if (updateCraDto.annee !== undefined) {
      cra.annee = updateCraDto.annee;
    }

    if (updateCraDto.statut !== undefined) {
      cra.statut = updateCraDto.statut;
    }

    if (updateCraDto.jours) {
      await this.craDayRepository.delete({ cra: { id: cra.id } });

      cra.jours = updateCraDto.jours.map((jour) =>
        this.craDayRepository.create(jour),
      );
    }

    return this.craRepository.save(cra);
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

  const workingDays = await this.calculateWorkingDays(cra.mois, cra.annee);
  const declaredDays = this.calculateDeclaredDays(cra);

if (declaredDays !== workingDays) {
  throw new BadRequestException(
    `CRA incohérent : ${declaredDays} jour(s) déclaré(s) pour ${workingDays} jour(s) ouvré(s).`,
  );
}

  cra.statut = CraStatus.SOUMIS_CLIENT;
  cra.date_soumission = new Date();

  return this.craRepository.save(cra);
}

async checkCraBeforeSubmit(createCraDto: CreateCraDto) {
  const workingDays = await this.calculateWorkingDays(
    createCraDto.mois,
    createCraDto.annee,
  );

  const declaredDays = (createCraDto.jours || [])
    .filter((jour) =>
      ['TRAVAIL', 'CONGE', 'ABSENCE', 'RTT'].includes(jour.type),
    )
    .reduce((total, jour) => total + Number(jour.duree), 0);

  if (declaredDays !== workingDays) {
    throw new BadRequestException(
      `CRA incohérent : ${declaredDays} jour(s) déclaré(s) pour ${workingDays} jour(s) ouvré(s).`,
    );
  }

  return {
    message: 'CRA cohérent',
    declaredDays,
    workingDays,
  };
}

async validateClient(id: number): Promise<Cra> {
  const cra = await this.findOne(id);

  if (cra.statut !== CraStatus.SOUMIS_CLIENT) {
    throw new BadRequestException('Ce CRA doit être soumis au client avant validation');
  }

  cra.statut = CraStatus.VALIDE_CLIENT;
  cra.date_validation_client = new Date();

  return this.craRepository.save(cra);
}

async refuseClient(id: number, motif: string): Promise<Cra> {
  const cra = await this.findOne(id);

  if (cra.statut !== CraStatus.SOUMIS_CLIENT) {
    throw new BadRequestException('Ce CRA ne peut pas être refusé par le client');
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
    throw new BadRequestException('Ce CRA doit être validé par le client avant validation admin');
  }

  cra.statut = CraStatus.VALIDE_ADMIN;
  cra.date_validation_admin = new Date();

  return this.craRepository.save(cra);
}

async refuseAdmin(id: number, motif: string): Promise<Cra> {
  const cra = await this.findOne(id);

  if (cra.statut !== CraStatus.VALIDE_CLIENT) {
    throw new BadRequestException('Ce CRA ne peut pas être refusé par l’administrateur');
  }

  if (!motif || motif.trim() === '') {
    throw new BadRequestException('Le motif de refus administrateur est obligatoire');
  }

  cra.statut = CraStatus.REFUSE_ADMIN;
  cra.date_refus_admin = new Date();
  cra.motif_refus_admin = motif;

  return this.craRepository.save(cra);
}

  async remove(id: number): Promise<void> {
    const cra = await this.findOne(id);
    await this.craRepository.remove(cra);
  }
}