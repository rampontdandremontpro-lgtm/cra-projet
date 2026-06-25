import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CollaboratorAssignment } from '../collaborator-assignments/collaborator-assignment.entity';
import { Holiday } from '../holidays/holiday.entity';
import { User, UserRole } from '../users/user.entity';
import { CraDay, CraDayType } from './cra-day.entity';
import { Cra, CraStatus } from './cra.entity';
import { CreateCraDto } from './dto/create-cra.dto';
import { RefuseCraDto } from './dto/refuse-cra.dto';
import { UpdateCraDto } from './dto/update-cra.dto';

@Injectable()
export class CraService {
  constructor(
    @InjectRepository(Cra)
    private readonly craRepository: Repository<Cra>,

    @InjectRepository(CraDay)
    private readonly craDayRepository: Repository<CraDay>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(CollaboratorAssignment)
    private readonly assignmentsRepository: Repository<CollaboratorAssignment>,

    @InjectRepository(Holiday)
    private readonly holidaysRepository: Repository<Holiday>,
  ) {}

  async create(
    collaboratorId: number,
    createCraDto: CreateCraDto,
  ): Promise<Cra> {
    const collaborator = await this.usersRepository.findOne({
      where: { id: collaboratorId },
    });

    if (!collaborator) {
      throw new NotFoundException('Collaborateur introuvable');
    }

    if (collaborator.role !== UserRole.COLLABORATEUR) {
      throw new BadRequestException(
        'Seul un utilisateur COLLABORATEUR peut créer un CRA',
      );
    }

    const activeAssignment = await this.assignmentsRepository.findOne({
      where: {
        collaborator: { id: collaboratorId },
        isActive: true,
      },
      relations: {
        service: { company: true },
      },
    });

    if (!activeAssignment) {
      throw new BadRequestException(
        'Impossible de créer un CRA : le collaborateur n’a aucune affectation active',
      );
    }

    const existingCra = await this.craRepository.findOne({
      where: {
        collaborateur: { id: collaboratorId },
        mois: createCraDto.mois,
        annee: createCraDto.annee,
      },
    });

    if (existingCra) {
      throw new BadRequestException(
        'Un CRA existe déjà pour ce collaborateur sur ce mois et cette année',
      );
    }

    if (createCraDto.days && createCraDto.days.length > 0) {
      await this.validateCraDaysDates(
        createCraDto.mois,
        createCraDto.annee,
        createCraDto.days,
      );
    }

    const cra = this.craRepository.create({
      collaborateur: collaborator,
      service: activeAssignment.service,
      mois: createCraDto.mois,
      annee: createCraDto.annee,
      statut: CraStatus.BROUILLON,
      dateSoumission: null,
      dateValidationClient: null,
      clientValidator: null,
      dateRefusClient: null,
      clientRefuser: null,
      motifRefusClient: null,
      dateValidationAdmin: null,
      adminValidator: null,
      dateRefusAdmin: null,
      adminRefuser: null,
      motifRefusAdmin: null,
    });

    const savedCra = await this.craRepository.save(cra);

    if (createCraDto.days && createCraDto.days.length > 0) {
      const craDays = createCraDto.days.map((day) =>
        this.craDayRepository.create({
          cra: savedCra,
          date: day.date,
          type: day.type,
          duree: day.duree,
          commentaire: day.commentaire ?? null,
        }),
      );

      await this.craDayRepository.save(craDays);
    }

    return this.findOne(savedCra.id);
  }

  async findAll(): Promise<Cra[]> {
    return this.craRepository.find({
      relations: {
        collaborateur: true,
        service: { company: true },
        days: true,
        clientValidator: true,
        clientRefuser: true,
        adminValidator: true,
        adminRefuser: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: number): Promise<Cra> {
    const cra = await this.craRepository.findOne({
      where: { id },
      relations: {
        collaborateur: true,
        service: { company: true },
        days: true,
        clientValidator: true,
        clientRefuser: true,
        adminValidator: true,
        adminRefuser: true,
      },
      order: {
        days: {
          date: 'ASC',
        },
      },
    });

    if (!cra) {
      throw new NotFoundException(`CRA avec l'id ${id} introuvable`);
    }

    return cra;
  }

    async findOneForUser(
    id: number,
    userId: number,
    role: UserRole,
  ): Promise<Cra> {
    const cra = await this.findOne(id);

    if (role === UserRole.ADMIN || role === UserRole.RH) {
      return cra;
    }

    if (role === UserRole.COLLABORATEUR) {
      if (cra.collaborateur.id !== userId) {
        throw new ForbiddenException(
          'Vous ne pouvez consulter que vos propres CRA',
        );
      }

      return cra;
    }

    if (role === UserRole.CLIENT) {
      const client = await this.usersRepository.findOne({
        where: { id: userId },
        relations: { service: true },
      });

      if (!client || !client.service) {
        throw new ForbiddenException(
          'Ce compte CLIENT n’est rattaché à aucun service',
        );
      }

      if (cra.service.id !== client.service.id) {
        throw new ForbiddenException(
          'Vous ne pouvez consulter que les CRA de votre service',
        );
      }

      return cra;
    }

    throw new ForbiddenException('Accès refusé');
  }

  async findByCollaborator(collaboratorId: number): Promise<Cra[]> {
    return this.craRepository.find({
      where: {
        collaborateur: { id: collaboratorId },
      },
      relations: {
        service: { company: true },
        days: true,
      },
      order: {
        annee: 'DESC',
        mois: 'DESC',
      },
    });
  }

  async findForClient(clientId: number): Promise<Cra[]> {
    const client = await this.usersRepository.findOne({
      where: { id: clientId },
      relations: {
        service: true,
      },
    });

    if (!client) {
      throw new NotFoundException('Utilisateur CLIENT introuvable');
    }

    if (client.role !== UserRole.CLIENT) {
      throw new ForbiddenException(
        'Seul un utilisateur CLIENT peut consulter les CRA de son service',
      );
    }

    if (!client.service) {
      throw new BadRequestException(
        'Ce CLIENT n’est rattaché à aucun service',
      );
    }

    return this.craRepository.find({
      where: {
        service: { id: client.service.id },
      },
      relations: {
        collaborateur: true,
        service: { company: true },
        days: true,
      },
      order: {
        annee: 'DESC',
        mois: 'DESC',
      },
    });
  }

  async findForAdminValidation(): Promise<Cra[]> {
    return this.craRepository.find({
      where: {
        statut: CraStatus.VALIDE_CLIENT,
      },
      relations: {
        collaborateur: true,
        service: { company: true },
        days: true,
      },
      order: {
        dateValidationClient: 'DESC',
      },
    });
  }

  async update(
  id: number,
  collaboratorId: number,
  updateCraDto: UpdateCraDto,
): Promise<Cra> {
    const cra = await this.findOne(id);

    if (cra.collaborateur.id !== collaboratorId) {
  throw new ForbiddenException(
    'Vous ne pouvez modifier que vos propres CRA',
  );
}

    if (
      cra.statut !== CraStatus.BROUILLON &&
      cra.statut !== CraStatus.REFUSE_CLIENT &&
      cra.statut !== CraStatus.REFUSE_ADMIN
    ) {
      throw new BadRequestException(
        'Ce CRA ne peut plus être modifié dans son statut actuel',
      );
    }

    if (updateCraDto.mois !== undefined) {
      cra.mois = updateCraDto.mois;
    }

    if (updateCraDto.annee !== undefined) {
      cra.annee = updateCraDto.annee;
    }

    if (updateCraDto.days !== undefined) {
      await this.validateCraDaysDates(cra.mois, cra.annee, updateCraDto.days);

      await this.craDayRepository
        .createQueryBuilder()
        .delete()
        .from(CraDay)
        .where('cra_id = :craId', { craId: cra.id })
        .execute();

      const newDays = updateCraDto.days.map((day) =>
        this.craDayRepository.create({
          cra,
          date: day.date,
          type: day.type,
          duree: day.duree ?? 1,
          commentaire: day.commentaire ?? null,
        }),
      );

      await this.craDayRepository.save(newDays);
    }

    cra.statut = CraStatus.BROUILLON;
    cra.dateSoumission = null;

    return this.craRepository.save(cra);
  }

  async submit(id: number, collaboratorId: number): Promise<Cra> {
    const cra = await this.findOne(id);

    if (cra.collaborateur.id !== collaboratorId) {
      throw new ForbiddenException(
        'Vous ne pouvez soumettre que vos propres CRA',
      );
    }

    if (
      cra.statut !== CraStatus.BROUILLON &&
      cra.statut !== CraStatus.REFUSE_CLIENT &&
      cra.statut !== CraStatus.REFUSE_ADMIN
    ) {
      throw new BadRequestException(
        'Seuls les CRA brouillons ou refusés peuvent être soumis',
      );
    }

    await this.validateCraCoherence(cra);

    cra.statut = CraStatus.SOUMIS_CLIENT;
    cra.dateSoumission = new Date();

    cra.dateValidationClient = null;
    cra.clientValidator = null;
    cra.dateRefusClient = null;
    cra.clientRefuser = null;
    cra.motifRefusClient = null;

    cra.dateValidationAdmin = null;
    cra.adminValidator = null;
    cra.dateRefusAdmin = null;
    cra.adminRefuser = null;
    cra.motifRefusAdmin = null;

    return this.craRepository.save(cra);
  }

  async validateClient(id: number, clientId: number): Promise<Cra> {
    const cra = await this.findOne(id);
    const client = await this.validateClientAccess(cra, clientId);

    if (cra.statut !== CraStatus.SOUMIS_CLIENT) {
      throw new BadRequestException(
        'Seuls les CRA soumis au client peuvent être validés par le client',
      );
    }

    cra.statut = CraStatus.VALIDE_CLIENT;
    cra.dateValidationClient = new Date();
    cra.clientValidator = client;

    cra.dateRefusClient = null;
    cra.clientRefuser = null;
    cra.motifRefusClient = null;

    return this.craRepository.save(cra);
  }

  async refuseClient(
    id: number,
    clientId: number,
    refuseCraDto: RefuseCraDto,
  ): Promise<Cra> {
    const cra = await this.findOne(id);
    const client = await this.validateClientAccess(cra, clientId);

    if (cra.statut !== CraStatus.SOUMIS_CLIENT) {
      throw new BadRequestException(
        'Seuls les CRA soumis au client peuvent être refusés par le client',
      );
    }

    cra.statut = CraStatus.REFUSE_CLIENT;
    cra.dateRefusClient = new Date();
    cra.clientRefuser = client;
    cra.motifRefusClient = refuseCraDto.motif;

    cra.dateValidationClient = null;
    cra.clientValidator = null;

    return this.craRepository.save(cra);
  }

  async validateAdmin(id: number, adminId: number): Promise<Cra> {
    const cra = await this.findOne(id);
    const admin = await this.validateAdminAccess(adminId);

    if (cra.statut !== CraStatus.VALIDE_CLIENT) {
      throw new BadRequestException(
        'Seuls les CRA validés par le client peuvent être validés définitivement',
      );
    }

    cra.statut = CraStatus.VALIDE_ADMIN;
    cra.dateValidationAdmin = new Date();
    cra.adminValidator = admin;

    cra.dateRefusAdmin = null;
    cra.adminRefuser = null;
    cra.motifRefusAdmin = null;

    return this.craRepository.save(cra);
  }

  async refuseAdmin(
    id: number,
    adminId: number,
    refuseCraDto: RefuseCraDto,
  ): Promise<Cra> {
    const cra = await this.findOne(id);
    const admin = await this.validateAdminAccess(adminId);

    if (cra.statut !== CraStatus.VALIDE_CLIENT) {
      throw new BadRequestException(
        'Seuls les CRA validés par le client peuvent être refusés par l’administrateur',
      );
    }

    cra.statut = CraStatus.REFUSE_ADMIN;
    cra.dateRefusAdmin = new Date();
    cra.adminRefuser = admin;
    cra.motifRefusAdmin = refuseCraDto.motif;

    cra.dateValidationAdmin = null;
    cra.adminValidator = null;

    return this.craRepository.save(cra);
  }

  async archive(id: number): Promise<Cra> {
    const cra = await this.findOne(id);

    if (cra.statut !== CraStatus.VALIDE_ADMIN) {
      throw new BadRequestException(
        'Seuls les CRA validés définitivement peuvent être archivés',
      );
    }

    cra.statut = CraStatus.ARCHIVE;

    return this.craRepository.save(cra);
  }

  async remove(id: number, collaboratorId: number): Promise<void> {
    const cra = await this.findOne(id);

    if (cra.statut !== CraStatus.BROUILLON) {
      throw new BadRequestException(
        'Seuls les CRA en brouillon peuvent être supprimés',
      );
    }

    if (cra.collaborateur.id !== collaboratorId) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres CRA',
      );
    }

    await this.craRepository.remove(cra);
  }

  private async validateClientAccess(
    cra: Cra,
    clientId: number,
  ): Promise<User> {
    const client = await this.usersRepository.findOne({
      where: { id: clientId },
      relations: { service: true },
    });

    if (!client) {
      throw new NotFoundException('Utilisateur CLIENT introuvable');
    }

    if (client.role !== UserRole.CLIENT) {
      throw new ForbiddenException(
        'Seul un utilisateur CLIENT peut valider ou refuser un CRA côté client',
      );
    }

    if (!client.service) {
      throw new BadRequestException(
        'Ce CLIENT n’est rattaché à aucun service',
      );
    }

    if (client.service.id !== cra.service.id) {
      throw new ForbiddenException(
        'Ce CLIENT ne peut gérer que les CRA de son propre service',
      );
    }

    return client;
  }

  private async validateAdminAccess(adminId: number): Promise<User> {
    const admin = await this.usersRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Administrateur introuvable');
    }

    if (admin.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Seul un administrateur peut effectuer la validation finale',
      );
    }

    return admin;
  }

  private async validateCraCoherence(cra: Cra): Promise<void> {
    if (!cra.days || cra.days.length === 0) {
      throw new BadRequestException('Le CRA ne contient aucune journée saisie');
    }

    await this.validateCraDaysDates(cra.mois, cra.annee, cra.days);

    const totalDeclared = cra.days.reduce((total, day) => {
      return total + Number(day.duree);
    }, 0);

    const workingDays = await this.countWorkingDays(cra.mois, cra.annee);

    if (totalDeclared !== workingDays) {
      throw new BadRequestException(
        `CRA incohérent : ${totalDeclared} jour(s) déclaré(s), mais ${workingDays} jour(s) ouvré(s) attendus`,
      );
    }
  }

  private async validateCraDaysDates(
    mois: number,
    annee: number,
    days: Array<{
      date?: string;
      type?: CraDayType;
      duree?: number;
    }>,
  ): Promise<void> {
    const dates = new Set<string>();
    const holidays = await this.getHolidayDatesByYear(annee);

    for (const day of days) {
      if (!day.date) {
        throw new BadRequestException('Chaque journée doit contenir une date');
      }

      if (dates.has(day.date)) {
        throw new BadRequestException(
          `La date ${day.date} est présente plusieurs fois dans le CRA`,
        );
      }

      dates.add(day.date);

      const parsedDate = this.parseDate(day.date);

      if (parsedDate.year !== annee || parsedDate.month !== mois) {
        throw new BadRequestException(
          `La date ${day.date} ne correspond pas au mois et à l’année du CRA`,
        );
      }

      if (this.isWeekend(day.date)) {
        throw new BadRequestException(
          `La date ${day.date} correspond à un week-end`,
        );
      }

      if (holidays.has(day.date)) {
        throw new BadRequestException(
          `La date ${day.date} correspond à un jour férié`,
        );
      }

      if (day.duree === undefined || Number(day.duree) <= 0) {
        throw new BadRequestException(
          `La durée de la date ${day.date} doit être supérieure à 0`,
        );
      }

      if (Number(day.duree) > 1) {
        throw new BadRequestException(
          `La durée de la date ${day.date} ne peut pas dépasser 1 jour`,
        );
      }
    }
  }

  private async countWorkingDays(mois: number, annee: number): Promise<number> {
    const holidays = await this.getHolidayDatesByYear(annee);
    const lastDayOfMonth = new Date(annee, mois, 0).getDate();

    let count = 0;

    for (let day = 1; day <= lastDayOfMonth; day++) {
      const date = this.formatDate(annee, mois, day);

      if (!this.isWeekend(date) && !holidays.has(date)) {
        count++;
      }
    }

    return count;
  }

  private async getHolidayDatesByYear(year: number): Promise<Set<string>> {
    const holidays = await this.holidaysRepository
      .createQueryBuilder('holiday')
      .where('YEAR(holiday.date) = :year', { year })
      .getMany();

    return new Set(
      holidays.map((holiday) => String(holiday.date).slice(0, 10)),
    );
  }

  private isWeekend(date: string): boolean {
    const { year, month, day } = this.parseDate(date);
    const jsDate = new Date(year, month - 1, day);
    const dayOfWeek = jsDate.getDay();

    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  private parseDate(date: string): {
    year: number;
    month: number;
    day: number;
  } {
    const parts = date.split('-');

    if (parts.length !== 3) {
      throw new BadRequestException(`Date invalide : ${date}`);
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    if (!year || !month || !day) {
      throw new BadRequestException(`Date invalide : ${date}`);
    }

    return { year, month, day };
  }

  private formatDate(year: number, month: number, day: number): string {
    const formattedMonth = String(month).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');

    return `${year}-${formattedMonth}-${formattedDay}`;
  }
}