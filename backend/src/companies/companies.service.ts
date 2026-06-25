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
    private readonly companyRepository: Repository<Company>,
  ) {}

  findAll() {
    return this.companyRepository.find({
  relations: {
    services: true,
  },
  order: {
    nom: 'ASC',
  },
});
  }

  async findOne(id: number) {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: {
  services: true,
}
    });

    if (!company) {
      throw new NotFoundException('Entreprise introuvable.');
    }

    return company;
  }

  create(createCompanyDto: CreateCompanyDto) {
    const company = this.companyRepository.create(createCompanyDto);
    return this.companyRepository.save(company);
  }

  async update(id: number, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.findOne(id);

    Object.assign(company, updateCompanyDto);

    return this.companyRepository.save(company);
  }

  async remove(id: number) {
    const company = await this.findOne(id);

    company.is_active = false;

    return this.companyRepository.save(company);
  }
}