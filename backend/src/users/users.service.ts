import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { Client } from '../clients/client.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);

    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async getAssignedClients(userId: number) {
  const user = await this.usersRepository.findOne({
    where: { id: userId },
    relations: {
      clients: true,
    },
  });

  if (!user) {
    throw new NotFoundException('Utilisateur introuvable');
  }

  return user.clients;
}

async assignClients(userId: number, clientIds: number[]) {
  const user = await this.usersRepository.findOne({
    where: { id: userId },
    relations: {
      clients: true,
    },
  });

  if (!user) {
    throw new NotFoundException('Utilisateur introuvable');
  }

  const clients = await this.clientsRepository.find({
    where: {
      id: In(clientIds),
    },
  });

  user.clients = clients;

  return this.usersRepository.save(user);
}
}