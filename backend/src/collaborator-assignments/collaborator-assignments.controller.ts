import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';

import { CollaboratorAssignmentsService } from './collaborator-assignments.service';

import { CreateCollaboratorAssignmentDto } from './dto/create-collaborator-assignment.dto';
import { UpdateCollaboratorAssignmentDto } from './dto/update-collaborator-assignment.dto';

@Controller('collaborator-assignments')
export class CollaboratorAssignmentsController {
  constructor(
    private readonly collaboratorAssignmentsService: CollaboratorAssignmentsService,
  ) {}

  @Get()
  findAll() {
    return this.collaboratorAssignmentsService.findAll();
  }

  @Get('collaborateur/:id')
  findActiveByCollaborator(
    @Param('id', ParseIntPipe) collaborateurId: number,
  ) {
    return this.collaboratorAssignmentsService.findActiveByCollaborator(
      collaborateurId,
    );
  }

  @Post()
  create(
    @Body() dto: CreateCollaboratorAssignmentDto,
    @Req() req,
  ) {
    return this.collaboratorAssignmentsService.create(
      dto,
      req.user.id,
    );
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCollaboratorAssignmentDto,
  ) {
    return this.collaboratorAssignmentsService.update(id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.collaboratorAssignmentsService.remove(id);
  }
}