import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { HolidaysService } from './holidays.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('holidays')
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Roles(UserRole.ADMIN)
  @Post('sync/martinique')
  syncMartiniqueHolidays() {
    return this.holidaysService.syncMartiniqueHolidays();
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() createHolidayDto: CreateHolidayDto) {
    return this.holidaysService.create(createHolidayDto);
  }

  @Roles(UserRole.ADMIN, UserRole.RH)
  @Get()
  findAll() {
    return this.holidaysService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.RH, UserRole.COLLABORATEUR, UserRole.CLIENT)
@Get('year/:year')
findByYear(@Param('year', ParseIntPipe) year: number) {
  return this.holidaysService.findByYear(year);
}

  @Roles(UserRole.ADMIN, UserRole.RH)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.holidaysService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateHolidayDto: UpdateHolidayDto,
  ) {
    return this.holidaysService.update(id, updateHolidayDto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.holidaysService.remove(id);
  }
}