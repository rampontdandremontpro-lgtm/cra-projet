import {
  Body,
  Controller,
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
import { CollaboratorAssignmentsService } from './collaborator-assignments.service';
import { CreateCollaboratorAssignmentDto } from './dto/create-collaborator-assignment.dto';
import { UpdateCollaboratorAssignmentDto } from './dto/update-collaborator-assignment.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('collaborator-assignments')
export class CollaboratorAssignmentsController {
  constructor(
    private readonly collaboratorAssignmentsService: CollaboratorAssignmentsService,
  ) {}

  @Roles(UserRole.RH)
  @Post()
  create(@Body() createAssignmentDto: CreateCollaboratorAssignmentDto) {
    return this.collaboratorAssignmentsService.create(createAssignmentDto);
  }

  @Roles(UserRole.RH, UserRole.ADMIN)
  @Get()
  findAll() {
    return this.collaboratorAssignmentsService.findAll();
  }

  @Roles(UserRole.RH, UserRole.ADMIN)
  @Get('collaborator/:collaboratorId/active')
  findActiveByCollaborator(
    @Param('collaboratorId', ParseIntPipe) collaboratorId: number,
  ) {
    return this.collaboratorAssignmentsService.findActiveByCollaborator(
      collaboratorId,
    );
  }

  @Roles(UserRole.RH, UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.collaboratorAssignmentsService.findOne(id);
  }

  @Roles(UserRole.RH)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAssignmentDto: UpdateCollaboratorAssignmentDto,
  ) {
    return this.collaboratorAssignmentsService.update(id, updateAssignmentDto);
  }

  @Roles(UserRole.RH)
  @Patch(':id/disable')
  disable(@Param('id', ParseIntPipe) id: number) {
    return this.collaboratorAssignmentsService.disable(id);
  }
}