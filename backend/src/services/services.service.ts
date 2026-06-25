import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Service } from './service.entity';
import { Company } from '../companies/company.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,

    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
  ) {}

  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    const company = await this.companiesRepository.findOne({
      where: { id: createServiceDto.companyId },
    });

    if (!company) {
      throw new NotFoundException(
        `Entreprise avec l'id ${createServiceDto.companyId} introuvable`,
      );
    }

    const service = this.servicesRepository.create({
      nom: createServiceDto.nom,
      company,
    });

    return this.servicesRepository.save(service);
  }

  async findAll(): Promise<Service[]> {
    return this.servicesRepository.find({
      relations: {
        company: true,
      },
      order: {
        nom: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<Service> {
    const service = await this.servicesRepository.findOne({
      where: { id },
      relations: {
        company: true,
      },
    });

    if (!service) {
      throw new NotFoundException(`Service avec l'id ${id} introuvable`);
    }

    return service;
  }

  async update(id: number, updateServiceDto: UpdateServiceDto): Promise<Service> {
    const service = await this.findOne(id);

    if (updateServiceDto.companyId) {
      const company = await this.companiesRepository.findOne({
        where: { id: updateServiceDto.companyId },
      });

      if (!company) {
        throw new NotFoundException(
          `Entreprise avec l'id ${updateServiceDto.companyId} introuvable`,
        );
      }

      service.company = company;
    }

    if (updateServiceDto.nom) {
      service.nom = updateServiceDto.nom;
    }

    return this.servicesRepository.save(service);
  }

  async remove(id: number): Promise<void> {
    const service = await this.findOne(id);

    await this.servicesRepository.remove(service);
  }
}