import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { Service } from '../services/service.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Un utilisateur avec cet email existe déjà');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.usersRepository.create({
      nom: createUserDto.nom,
      prenom: createUserDto.prenom,
      email: createUserDto.email,
      password: hashedPassword,
      role: createUserDto.role,
      contractType: createUserDto.contractType ?? null,
    });

    if (createUserDto.role === UserRole.CLIENT) {
      if (!createUserDto.serviceId) {
        throw new BadRequestException(
          'Un utilisateur CLIENT doit être rattaché à un service',
        );
      }

      const service = await this.servicesRepository.findOne({
        where: { id: createUserDto.serviceId },
      });

      if (!service) {
        throw new NotFoundException(
          `Service avec l'id ${createUserDto.serviceId} introuvable`,
        );
      }

      user.service = service;
    }

    if (createUserDto.role !== UserRole.CLIENT) {
      user.service = null;
    }

    if (createUserDto.role !== UserRole.COLLABORATEUR) {
      user.contractType = null;
    }

    if (
      createUserDto.role === UserRole.COLLABORATEUR &&
      !createUserDto.contractType
    ) {
      throw new BadRequestException(
        'Un collaborateur doit avoir un type de contrat',
      );
    }

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: {
        service: {
          company: true,
        },
      },
      order: {
        nom: 'ASC',
        prenom: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: {
        service: {
          company: true,
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'id ${id} introuvable`);
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new BadRequestException(
          'Un utilisateur avec cet email existe déjà',
        );
      }

      user.email = updateUserDto.email;
    }

    if (updateUserDto.nom !== undefined) {
      user.nom = updateUserDto.nom;
    }

    if (updateUserDto.prenom !== undefined) {
      user.prenom = updateUserDto.prenom;
    }

    if (updateUserDto.password !== undefined) {
      user.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.role !== undefined) {
      user.role = updateUserDto.role;
    }

    if (updateUserDto.contractType !== undefined) {
      user.contractType = updateUserDto.contractType;
    }

    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }

    if (updateUserDto.serviceId !== undefined) {
      const service = await this.servicesRepository.findOne({
        where: { id: updateUserDto.serviceId },
      });

      if (!service) {
        throw new NotFoundException(
          `Service avec l'id ${updateUserDto.serviceId} introuvable`,
        );
      }

      user.service = service;
    }

    if (user.role === UserRole.CLIENT && !user.service) {
      throw new BadRequestException(
        'Un utilisateur CLIENT doit être rattaché à un service',
      );
    }

    if (user.role !== UserRole.CLIENT) {
      user.service = null;
    }

    if (user.role === UserRole.COLLABORATEUR && !user.contractType) {
      throw new BadRequestException(
        'Un collaborateur doit avoir un type de contrat',
      );
    }

    if (user.role !== UserRole.COLLABORATEUR) {
      user.contractType = null;
    }

    return this.usersRepository.save(user);
  }

  async disable(id: number): Promise<User> {
    const user = await this.findOne(id);

    user.isActive = false;

    return this.usersRepository.save(user);
  }
}