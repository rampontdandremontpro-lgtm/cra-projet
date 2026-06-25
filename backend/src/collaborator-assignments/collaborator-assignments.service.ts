import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Service } from '../services/service.entity';
import { User, UserRole } from '../users/user.entity';
import { CollaboratorAssignment } from './collaborator-assignment.entity';
import { CreateCollaboratorAssignmentDto } from './dto/create-collaborator-assignment.dto';
import { UpdateCollaboratorAssignmentDto } from './dto/update-collaborator-assignment.dto';

@Injectable()
export class CollaboratorAssignmentsService {
  constructor(
    @InjectRepository(CollaboratorAssignment)
    private readonly assignmentsRepository: Repository<CollaboratorAssignment>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
  ) {}

  async create(
    createAssignmentDto: CreateCollaboratorAssignmentDto,
  ): Promise<CollaboratorAssignment> {
    const collaborator = await this.usersRepository.findOne({
      where: { id: createAssignmentDto.collaboratorId },
    });

    if (!collaborator) {
      throw new NotFoundException('Collaborateur introuvable');
    }

    if (collaborator.role !== UserRole.COLLABORATEUR) {
      throw new BadRequestException(
        'L’utilisateur sélectionné doit avoir le rôle COLLABORATEUR',
      );
    }

    const assignedBy = await this.usersRepository.findOne({
      where: { id: createAssignmentDto.assignedByUserId },
    });

    if (!assignedBy) {
      throw new NotFoundException('Utilisateur RH introuvable');
    }

    if (assignedBy.role !== UserRole.RH && assignedBy.role !== UserRole.ADMIN) {
      throw new BadRequestException(
        'Seuls les RH ou les administrateurs peuvent affecter un collaborateur',
      );
    }

    const service = await this.servicesRepository.findOne({
      where: { id: createAssignmentDto.serviceId },
      relations: { company: true },
    });

    if (!service) {
      throw new NotFoundException('Service introuvable');
    }

    const activeAssignments = await this.assignmentsRepository.find({
      where: {
        collaborator: { id: collaborator.id },
        isActive: true,
      },
    });

    for (const assignment of activeAssignments) {
      assignment.isActive = false;
      assignment.endDate = createAssignmentDto.startDate;
      await this.assignmentsRepository.save(assignment);
    }

    const newAssignment = this.assignmentsRepository.create({
      collaborator,
      service,
      assignedBy,
      startDate: createAssignmentDto.startDate,
      endDate: null,
      isActive: true,
    });

    return this.assignmentsRepository.save(newAssignment);
  }

  async findAll(): Promise<CollaboratorAssignment[]> {
    return this.assignmentsRepository.find({
      relations: {
        collaborator: true,
        service: { company: true },
        assignedBy: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: number): Promise<CollaboratorAssignment> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id },
      relations: {
        collaborator: true,
        service: { company: true },
        assignedBy: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Affectation avec l'id ${id} introuvable`);
    }

    return assignment;
  }

  async findActiveByCollaborator(
    collaboratorId: number,
  ): Promise<CollaboratorAssignment> {
    const assignment = await this.assignmentsRepository.findOne({
      where: {
        collaborator: { id: collaboratorId },
        isActive: true,
      },
      relations: {
        collaborator: true,
        service: { company: true },
        assignedBy: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        'Aucune affectation active trouvée pour ce collaborateur',
      );
    }

    return assignment;
  }

  async update(
    id: number,
    updateAssignmentDto: UpdateCollaboratorAssignmentDto,
  ): Promise<CollaboratorAssignment> {
    const assignment = await this.findOne(id);

    if (updateAssignmentDto.serviceId !== undefined) {
      const service = await this.servicesRepository.findOne({
        where: { id: updateAssignmentDto.serviceId },
        relations: { company: true },
      });

      if (!service) {
        throw new NotFoundException('Service introuvable');
      }

      assignment.service = service;
    }

    if (updateAssignmentDto.startDate !== undefined) {
      assignment.startDate = updateAssignmentDto.startDate;
    }

    if (updateAssignmentDto.endDate !== undefined) {
      assignment.endDate = updateAssignmentDto.endDate;
    }

    if (updateAssignmentDto.isActive !== undefined) {
      assignment.isActive = updateAssignmentDto.isActive;
    }

    return this.assignmentsRepository.save(assignment);
  }

  async disable(id: number): Promise<CollaboratorAssignment> {
    const assignment = await this.findOne(id);

    assignment.isActive = false;
    assignment.endDate = new Date().toISOString().split('T')[0];

    return this.assignmentsRepository.save(assignment);
  }
}