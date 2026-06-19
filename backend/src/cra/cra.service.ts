import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Cra } from './cra.entity';
import { CraDay } from './cra-day.entity';
import { User } from '../users/user.entity';
import { Client } from '../clients/client.entity';

import { CreateCraDto } from './dto/create-cra.dto';
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

    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
  ) {}

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

  async remove(id: number): Promise<void> {
    const cra = await this.findOne(id);
    await this.craRepository.remove(cra);
  }
}