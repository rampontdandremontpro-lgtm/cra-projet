import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CraService } from './cra.service';
import { CreateCraDto } from './dto/create-cra.dto';
import { UpdateCraDto } from './dto/update-cra.dto';

@Controller('cra')
export class CraController {
  constructor(private readonly craService: CraService) {}

  @Post()
  create(@Body() createCraDto: CreateCraDto) {
    return this.craService.create(createCraDto);
  }

  @Get()
  findAll() {
    return this.craService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.craService.findOne(Number(id));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCraDto: UpdateCraDto,
  ) {
    return this.craService.update(Number(id), updateCraDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.craService.remove(Number(id));
  }
}