import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { Holiday } from './holiday.entity';

@Injectable()
export class HolidaysService {
  constructor(
    @InjectRepository(Holiday)
    private readonly holidaysRepository: Repository<Holiday>,
  ) {}

  async create(createHolidayDto: CreateHolidayDto): Promise<Holiday> {
    const holiday = this.holidaysRepository.create(createHolidayDto);
    return this.holidaysRepository.save(holiday);
  }

  async findAll(): Promise<Holiday[]> {
    return this.holidaysRepository.find({
      order: {
        date: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<Holiday> {
    const holiday = await this.holidaysRepository.findOne({
      where: { id },
    });

    if (!holiday) {
      throw new NotFoundException(`Jour férié avec l'id ${id} introuvable`);
    }

    return holiday;
  }

  async update(
    id: number,
    updateHolidayDto: UpdateHolidayDto,
  ): Promise<Holiday> {
    const holiday = await this.findOne(id);

    Object.assign(holiday, updateHolidayDto);

    return this.holidaysRepository.save(holiday);
  }

  async remove(id: number): Promise<void> {
    const holiday = await this.findOne(id);
    await this.holidaysRepository.remove(holiday);
  }

  async findByYear(year: number): Promise<Holiday[]> {
    return this.holidaysRepository
      .createQueryBuilder('holiday')
      .where('YEAR(holiday.date) = :year', { year })
      .orderBy('holiday.date', 'ASC')
      .getMany();
  }

  async syncMartiniqueHolidays() {
    const apiUrl =
      'https://calendrier.api.gouv.fr/jours-feries/martinique.json';

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new BadRequestException(
        'Impossible de récupérer les jours fériés depuis l’API officielle',
      );
    }

    const data = (await response.json()) as Record<string, string>;

    const savedHolidays: Holiday[] = [];

    for (const [date, nom] of Object.entries(data)) {
      let holiday = await this.holidaysRepository.findOne({
        where: { date },
      });

      if (!holiday) {
        holiday = this.holidaysRepository.create({
          date,
          nom,
          zone: 'Martinique',
        });
      } else {
        holiday.nom = nom;
        holiday.zone = 'Martinique';
      }

      const savedHoliday = await this.holidaysRepository.save(holiday);
      savedHolidays.push(savedHoliday);
    }

    return {
      message: 'Jours fériés de Martinique synchronisés avec succès',
      total: savedHolidays.length,
      holidays: savedHolidays,
    };
  }
}