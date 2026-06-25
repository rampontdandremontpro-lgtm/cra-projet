import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Company } from './company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const company = this.companiesRepository.create(createCompanyDto);
    return this.companiesRepository.save(company);
  }

  async findAll(): Promise<Company[]> {
    return this.companiesRepository.find({
      relations: {
          services: true,
        },
        order: {
          nom: 'ASC',
        },
    });
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.companiesRepository.findOne({
      where: { id },
      relations: {
  services: true,
}
    });

    if (!company) {
      throw new NotFoundException(`Entreprise avec l'id ${id} introuvable`);
    }

    return company;
  }

  async update(
    id: number,
    updateCompanyDto: UpdateCompanyDto,
  ): Promise<Company> {
    const company = await this.findOne(id);

    Object.assign(company, updateCompanyDto);

    return this.companiesRepository.save(company);
  }

  async remove(id: number): Promise<void> {
    const company = await this.findOne(id);

    company.isActive = false;

    await this.companiesRepository.save(company);
  }
}