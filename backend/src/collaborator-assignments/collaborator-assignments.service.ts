import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CollaboratorAssignment } from './collaborator-assignment.entity';
import { User } from '../users/user.entity';
import { AppServiceEntity } from '../services/service.entity';

import { CreateCollaboratorAssignmentDto } from './dto/create-collaborator-assignment.dto';
import { UpdateCollaboratorAssignmentDto } from './dto/update-collaborator-assignment.dto';

@Injectable()
export class CollaboratorAssignmentsService {
  constructor(
    @InjectRepository(CollaboratorAssignment)
    private readonly assignmentRepository: Repository<CollaboratorAssignment>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(AppServiceEntity)
    private readonly serviceRepository: Repository<AppServiceEntity>,
  ) {}

  findAll() {
    return this.assignmentRepository.find({
      relations: {
        collaborateur: true,
        service: {
          company: true,
        },
        assignedBy: true,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findActiveByCollaborator(collaborateurId: number) {
    return this.assignmentRepository.findOne({
      where: {
        collaborateur_id: collaborateurId,
        is_active: true,
      },
      relations: {
        service: {
          company: true,
        },
      },
    });
  }

  async create(
    dto: CreateCollaboratorAssignmentDto,
    assignedByUserId: number,
  ) {
    const collaborateur = await this.userRepository.findOne({
      where: {
        id: dto.collaborateur_id,
      },
    });

    if (!collaborateur) {
      throw new NotFoundException('Collaborateur introuvable.');
    }

    const service = await this.serviceRepository.findOne({
      where: {
        id: dto.service_id,
      },
    });

    if (!service) {
      throw new NotFoundException('Service introuvable.');
    }

    await this.assignmentRepository.update(
      {
        collaborateur_id: dto.collaborateur_id,
        is_active: true,
      },
      {
        is_active: false,
      },
    );

    const assignment = this.assignmentRepository.create({
      collaborateur_id: dto.collaborateur_id,
      service_id: dto.service_id,
      assigned_by_user_id: assignedByUserId,
      start_date: dto.start_date ?? null,
      end_date: dto.end_date ?? null,
      is_active: true,
    });

    return this.assignmentRepository.save(assignment);
  }

  async update(
    id: number,
    dto: UpdateCollaboratorAssignmentDto,
  ) {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Affectation introuvable.');
    }

    Object.assign(assignment, dto);

    return this.assignmentRepository.save(assignment);
  }

  async remove(id: number) {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Affectation introuvable.');
    }

    return this.assignmentRepository.remove(assignment);
  }
}