import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppServiceEntity } from './service.entity';
import { Company } from '../companies/company.entity';

import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(AppServiceEntity)
    private readonly serviceRepository: Repository<AppServiceEntity>,

    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  findAll() {
    return this.serviceRepository.find({
      relations: {
        company: true,
      },
      order: {
        nom: 'ASC',
      },
    });
  }

  async findOne(id: number) {
    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: {
        company: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Service introuvable.');
    }

    return service;
  }

  async create(createServiceDto: CreateServiceDto) {
    const company = await this.companyRepository.findOne({
      where: {
        id: createServiceDto.company_id,
      },
    });

    if (!company) {
      throw new NotFoundException('Entreprise introuvable.');
    }

    const service = this.serviceRepository.create({
      nom: createServiceDto.nom,
      company,
    });

    return this.serviceRepository.save(service);
  }

  async update(id: number, updateServiceDto: UpdateServiceDto) {
    const service = await this.findOne(id);

    if (updateServiceDto.nom) {
      service.nom = updateServiceDto.nom;
    }

    if (updateServiceDto.company_id) {
      const company = await this.companyRepository.findOne({
        where: {
          id: updateServiceDto.company_id,
        },
      });

      if (!company) {
        throw new NotFoundException('Entreprise introuvable.');
      }

      service.company = company;
    }

    return this.serviceRepository.save(service);
  }

  async remove(id: number) {
    const service = await this.findOne(id);

    return this.serviceRepository.remove(service);
  }
}