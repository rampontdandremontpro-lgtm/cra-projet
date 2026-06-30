import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { CollaboratorAssignment } from '../collaborator-assignments/collaborator-assignment.entity';
import { Holiday } from '../holidays/holiday.entity';
import { User, UserRole } from '../users/user.entity';
import { CraDay, CraDayType } from './cra-day.entity';
import { Cra, CraStatus } from './cra.entity';
import { CraActivityColumn } from './cra-activity-column.entity';
import { CraActivityEntry } from './cra-activity-entry.entity';
import { CreateCraDto } from './dto/create-cra.dto';
import { CreateCraDayDto } from './dto/create-cra-day.dto';
import { RefuseCraDto } from './dto/refuse-cra.dto';
import { UpdateCraDto } from './dto/update-cra.dto';

@Injectable()
export class CraService {
  constructor(
    @InjectRepository(Cra)
    private readonly craRepository: Repository<Cra>,

    @InjectRepository(CraDay)
    private readonly craDayRepository: Repository<CraDay>,

    @InjectRepository(CraActivityColumn)
    private readonly craActivityColumnRepository: Repository<CraActivityColumn>,

    @InjectRepository(CraActivityEntry)
    private readonly craActivityEntryRepository: Repository<CraActivityEntry>,

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
      where: {
        id: collaboratorId,
      },
    });

    if (!collaborator || collaborator.role !== UserRole.COLLABORATEUR) {
      throw new BadRequestException('Collaborateur invalide');
    }

    const activeAssignment =
      await this.findActiveAssignmentOrFail(collaboratorId);

    this.validateCraPeriodWithAssignment(
      createCraDto.mois,
      createCraDto.annee,
      activeAssignment,
    );

    this.validateCraDaysWithAssignment(
      createCraDto.days || [],
      activeAssignment,
    );

    await this.validateCraDaysDates(
  createCraDto.mois,
  createCraDto.annee,
  createCraDto.days || [],
  false,
);

    this.validateActivityEntriesRules(createCraDto.days || []);

    const existingCra = await this.craRepository.findOne({
      where: {
        collaborateur: {
          id: collaboratorId,
        },
        mois: createCraDto.mois,
        annee: createCraDto.annee,
      },
    });

    if (existingCra) {
      throw new BadRequestException(
        'Un CRA existe déjà pour ce mois et cette année',
      );
    }

    const cra = await this.craRepository.save(
      this.craRepository.create({
        collaborateur: collaborator,
        service: activeAssignment.service,
        mois: createCraDto.mois,
        annee: createCraDto.annee,
        statut: CraStatus.BROUILLON,
        dateSoumission: null,
      }),
    );

    const daysToSave = (createCraDto.days || []).map((day) =>
      this.craDayRepository.create({
        cra: { id: cra.id } as Cra,
        date: day.date,
        type: day.type,
        duree: this.calculateDayDuree(day),
        commentaire: day.commentaire || null,
      }),
    );

    const savedDays =
      daysToSave.length > 0
        ? await this.craDayRepository.save(daysToSave)
        : [];

    await this.saveActivityColumnsAndEntries(
      cra,
      createCraDto.activityColumns || [],
      createCraDto.days || [],
      savedDays,
    );

    return this.findOne(cra.id);
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
        days: {
          activityEntries: {
            activityColumn: true,
          },
        },
        activityColumns: true,
        activityEntries: {
          activityColumn: true,
          craDay: true,
        },
        clientValidator: true,
        clientRefuser: true,
        adminValidator: true,
        adminRefuser: true,
      },
        order: {
        days: {
          date: 'ASC',
        },
        activityColumns: {
          orderIndex: 'ASC',
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
      relations: { service: true },
    });

    if (!client || client.role !== UserRole.CLIENT || !client.service) {
      throw new ForbiddenException(
        'Ce compte client n’est rattaché à aucun service',
      );
    }

    return this.craRepository.find({
      where: {
        service: { id: client.service.id },
        statut: In([
          CraStatus.SOUMIS_CLIENT,
          CraStatus.VALIDE_CLIENT,
          CraStatus.REFUSE_CLIENT,
          CraStatus.VALIDE_ADMIN,
          CraStatus.REFUSE_ADMIN,
          CraStatus.ARCHIVE,
        ]),
      },
      relations: {
        collaborateur: true,
        service: {
          company: true,
        },
        days: true,
        clientValidator: true,
        clientRefuser: true,
        adminValidator: true,
        adminRefuser: true,
      },
      order: {
        annee: 'DESC',
        mois: 'DESC',
        createdAt: 'DESC',
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
      throw new ForbiddenException('Vous ne pouvez modifier que vos CRA');
    }

    if (
      cra.statut !== CraStatus.BROUILLON &&
      cra.statut !== CraStatus.REFUSE_CLIENT &&
      cra.statut !== CraStatus.REFUSE_ADMIN
    ) {
      throw new BadRequestException(
        'Seuls les CRA en brouillon ou refusés peuvent être modifiés',
      );
    }

    const mois = updateCraDto.mois ?? cra.mois;
    const annee = updateCraDto.annee ?? cra.annee;
    const days = updateCraDto.days || [];

    if (days.length === 0) {
      throw new BadRequestException('Le CRA doit contenir au moins un jour');
    }

    const activeAssignment =
      await this.findActiveAssignmentOrFail(collaboratorId);

    this.validateCraPeriodWithAssignment(mois, annee, activeAssignment);

    this.validateCraDaysWithAssignment(days, activeAssignment);

    await this.validateCraDaysDates(mois, annee, days, false);

    this.validateActivityEntriesRules(days);

    cra.mois = mois;
    cra.annee = annee;
    cra.service = activeAssignment.service;
    cra.statut = CraStatus.BROUILLON;

    cra.dateSoumission = null;

    cra.clientValidator = null;
    cra.dateValidationClient = null;
    cra.clientRefuser = null;
    cra.dateRefusClient = null;
    cra.motifRefusClient = null;

    cra.adminValidator = null;
    cra.dateValidationAdmin = null;
    cra.adminRefuser = null;
    cra.dateRefusAdmin = null;
    cra.motifRefusAdmin = null;

    const savedCra = await this.craRepository.save(cra);

    await this.clearCraDynamicData(savedCra.id);

    const daysToSave = days.map((day) =>
      this.craDayRepository.create({
        cra: { id: savedCra.id } as Cra,
        date: day.date,
        type: day.type,
        duree: this.calculateDayDuree(day),
        commentaire: day.commentaire || null,
      }),
    );

    const savedDays = await this.craDayRepository.save(daysToSave);

    await this.saveActivityColumnsAndEntries(
      savedCra,
      updateCraDto.activityColumns || [],
      days,
      savedDays,
    );

    return this.findOne(savedCra.id);
  }
  
  async submit(id: number, collaboratorId: number): Promise<Cra> {
    const cra = await this.findOne(id);

    if (cra.collaborateur.id !== collaboratorId) {
      throw new ForbiddenException(
        'Vous ne pouvez soumettre que vos propres CRA',
      );
    }

    const activeAssignment = await this.findActiveAssignmentOrFail(
  cra.collaborateur.id,
);

this.validateCraPeriodWithAssignment(cra.mois, cra.annee, activeAssignment);
this.validateCraDaysWithAssignment(cra.days, activeAssignment);

    if (
      cra.statut !== CraStatus.BROUILLON &&
      cra.statut !== CraStatus.REFUSE_CLIENT &&
      cra.statut !== CraStatus.REFUSE_ADMIN
    ) {
      throw new BadRequestException(
        'Seuls les CRA brouillons ou refusés peuvent être soumis',
      );
    }

    await this.validateCraDaysDates(
  cra.mois,
  cra.annee,
  cra.days || [],
  true,
);

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
  days: any[],
  requireDuration = false,
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

      const duree = Number(day.duree || 0);

if (requireDuration && day.type !== CraDayType.CONGE && duree <= 0) {
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

    private toJsDate(date: string): Date {
    const { year, month, day } = this.parseDate(date);
    return new Date(year, month - 1, day);
  }

  private formatDate(year: number, month: number, day: number): string {
    const formattedMonth = String(month).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');

    return `${year}-${formattedMonth}-${formattedDay}`;
  }

      private async findActiveAssignmentOrFail(
    collaboratorId: number,
  ): Promise<CollaboratorAssignment> {
    const activeAssignment = await this.assignmentsRepository.findOne({
      where: {
        collaborator: { id: collaboratorId },
        isActive: true,
      },
      relations: {
        service: {
          company: true,
        },
      },
    });

    if (!activeAssignment) {
      throw new BadRequestException(
        "Impossible de créer un CRA : le collaborateur n’a aucune affectation active",
      );
    }

    return activeAssignment;
  }

    private validateCraPeriodWithAssignment(
    mois: number,
    annee: number,
    assignment: CollaboratorAssignment,
  ): void {
    const monthStart = new Date(annee, mois - 1, 1);
    const monthEnd = new Date(annee, mois, 0);

    const assignmentStart = this.toJsDate(assignment.startDate);

    if (monthEnd < assignmentStart) {
      throw new BadRequestException(
        `Impossible de créer ce CRA : l’affectation commence le ${assignment.startDate}`,
      );
    }

    if (assignment.endDate) {
      const assignmentEnd = this.toJsDate(assignment.endDate);

      if (monthStart > assignmentEnd) {
        throw new BadRequestException(
          `Impossible de créer ce CRA : l’affectation s’est terminée le ${assignment.endDate}`,
        );
      }
    }
  }

    private validateCraDaysWithAssignment(
    days: Array<{ date?: string }>,
    assignment: CollaboratorAssignment,
  ): void {
    const assignmentStart = this.toJsDate(assignment.startDate);
    const assignmentEnd = assignment.endDate
      ? this.toJsDate(assignment.endDate)
      : null;

    for (const day of days) {
      if (!day.date) {
        throw new BadRequestException(
          'Chaque journée doit contenir une date',
        );
      }

      const currentDate = this.toJsDate(day.date);

      if (currentDate < assignmentStart) {
        throw new BadRequestException(
          `La date ${day.date} est avant le début de l’affectation`,
        );
      }

      if (assignmentEnd && currentDate > assignmentEnd) {
        throw new BadRequestException(
          `La date ${day.date} est après la fin de l’affectation`,
        );
      }
    }
  }

      private normalizeDateString(date: string | Date): string {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }

    return String(date).split('T')[0];
  }

    private async clearCraDynamicData(craId: number): Promise<void> {
    await this.craActivityEntryRepository
      .createQueryBuilder()
      .delete()
      .where('cra_id = :craId', { craId })
      .execute();

    await this.craActivityColumnRepository
      .createQueryBuilder()
      .delete()
      .where('cra_id = :craId', { craId })
      .execute();

    await this.craDayRepository
      .createQueryBuilder()
      .delete()
      .where('cra_id = :craId', { craId })
      .execute();
  }

  private calculateDayDuree(day: {
  type: CraDayType;
  duree?: number;
  activityEntries?: { duree: number }[];
}): number {
  if (day.type === CraDayType.CONGE) {
    return 1;
  }

  const activityTotal = (day.activityEntries || []).reduce(
    (total, entry) => total + Number(entry.duree || 0),
    0,
  );

  if (activityTotal > 0) {
    return Number(activityTotal.toFixed(1));
  }

  return Number(day.duree || 0);
}

  private validateActivityEntriesRules(days: CreateCraDayDto[]): void {
  for (const day of days) {
    const entries = day.activityEntries || [];

    const total = entries.reduce(
      (sum, entry) => sum + Number(entry.duree || 0),
      0,
    );

    if (day.type === CraDayType.CONGE && entries.length > 0) {
      throw new BadRequestException(
        `La date ${day.date} est en congé, les activités doivent être vides`,
      );
    }

    if (day.type === CraDayType.TRAVAIL && total > 1) {
      throw new BadRequestException(
        `Le total des activités du ${day.date} ne peut pas dépasser 1 jour`,
      );
    }

    if (
      (day.type === CraDayType.ABSENCE ||
        day.type === CraDayType.RTT ||
        day.type === CraDayType.ARRET_MALADIE) &&
      total !== 0 &&
      total !== 0.5 &&
      total !== 1
    ) {
      throw new BadRequestException(
        `La durée du ${day.date} doit être vide, égale à 0.5 ou égale à 1 jour`,
      );
    }
  }
}

  private async saveActivityColumnsAndEntries(
    cra: Cra,
    activityColumnsDto: CreateCraDto['activityColumns'] = [],
    daysDto: CreateCraDto['days'] = [],
    savedDays: CraDay[] = [],
  ): Promise<void> {
    if (!activityColumnsDto || activityColumnsDto.length === 0) {
      return;
    }

    const savedColumns = await this.craActivityColumnRepository.save(
      activityColumnsDto.map((column, index) =>
        this.craActivityColumnRepository.create({
          cra: { id: cra.id } as Cra,
          nom: column.nom,
          orderIndex: column.orderIndex ?? index,
        }),
      ),
    );

    const savedDaysByDate = new Map(
      savedDays.map((day) => [this.normalizeDateString(day.date), day]),
    );

    const entriesToSave: CraActivityEntry[] = [];

    for (const dayDto of daysDto || []) {
      const savedDay = savedDaysByDate.get(
        this.normalizeDateString(dayDto.date),
      );

      if (!savedDay) continue;

      for (const entryDto of dayDto.activityEntries || []) {
        const column = savedColumns[entryDto.activityColumnIndex];

        if (!column) {
          throw new BadRequestException(
            `Colonne d’activité introuvable pour la date ${dayDto.date}`,
          );
        }

        entriesToSave.push(
          this.craActivityEntryRepository.create({
            cra: { id: cra.id } as Cra,
            craDay: { id: savedDay.id } as CraDay,
            activityColumn: { id: column.id } as CraActivityColumn,
            duree: Number(entryDto.duree),
          }),
        );
      }
    }

    if (entriesToSave.length > 0) {
      await this.craActivityEntryRepository.save(entriesToSave);
    }
  }
}