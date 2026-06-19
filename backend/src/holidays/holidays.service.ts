import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Holiday } from './holiday.entity';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';

@Injectable()
export class HolidaysService {
  constructor(
    @InjectRepository(Holiday)
    private readonly holidaysRepository: Repository<Holiday>,
  ) {}

  create(createHolidayDto: CreateHolidayDto): Promise<Holiday> {
    const holiday = this.holidaysRepository.create(createHolidayDto);
    return this.holidaysRepository.save(holiday);
  }

  findAll(): Promise<Holiday[]> {
    return this.holidaysRepository.find();
  }

  async findOne(id: number): Promise<Holiday> {
    const holiday = await this.holidaysRepository.findOne({
      where: { id },
    });

    if (!holiday) {
      throw new NotFoundException('Jour férié introuvable');
    }

    return holiday;
  }

  async update(id: number, updateHolidayDto: UpdateHolidayDto): Promise<Holiday> {
    const holiday = await this.findOne(id);

    Object.assign(holiday, updateHolidayDto);

    return this.holidaysRepository.save(holiday);
  }

  async remove(id: number): Promise<void> {
    const holiday = await this.findOne(id);
    await this.holidaysRepository.remove(holiday);
  }
}