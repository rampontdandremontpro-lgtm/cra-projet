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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PdfService } from '../pdf/pdf.service';
import { UserRole } from '../users/user.entity';
import { CraService } from './cra.service';
import { CreateCraDto } from './dto/create-cra.dto';
import { RefuseCraDto } from './dto/refuse-cra.dto';
import { UpdateCraDto } from './dto/update-cra.dto';

type AuthenticatedRequest = {
  user: {
    id: number;
    email: string;
    role: UserRole;
  };
};

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cra')
export class CraController {
  constructor(
    private readonly craService: CraService,
    private readonly pdfService: PdfService,
  ) {}

  @Roles(UserRole.COLLABORATEUR)
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() createCraDto: CreateCraDto) {
    return this.craService.create(req.user.id, createCraDto);
  }

  @Roles(UserRole.RH, UserRole.ADMIN)
  @Get()
  findAll() {
    return this.craService.findAll();
  }

  @Roles(UserRole.COLLABORATEUR)
  @Get('my')
  findMyCra(@Req() req: AuthenticatedRequest) {
    return this.craService.findByCollaborator(req.user.id);
  }

  @Roles(UserRole.CLIENT)
  @Get('client')
  findForClient(@Req() req: AuthenticatedRequest) {
    return this.craService.findForClient(req.user.id);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/to-validate')
  findForAdminValidation() {
    return this.craService.findForAdminValidation();
  }

  @Roles(UserRole.COLLABORATEUR, UserRole.CLIENT, UserRole.RH, UserRole.ADMIN)
  @Get(':id/pdf')
  async downloadPdf(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const cra = await this.craService.findOneForUser(
      id,
      req.user.id,
      req.user.role,
    );

    const pdfBuffer = await this.pdfService.generateCraPdf(cra);

    const fileName = `CRA-${cra.annee}-${String(cra.mois).padStart(2, '0')}-${cra.id}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': pdfBuffer.length,
    });

    return res.send(pdfBuffer);
  }

  @Roles(UserRole.COLLABORATEUR, UserRole.CLIENT, UserRole.RH, UserRole.ADMIN)
  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.craService.findOneForUser(id, req.user.id, req.user.role);
  }

  @Roles(UserRole.COLLABORATEUR)
@Patch(':id')
update(
  @Req() req: AuthenticatedRequest,
  @Param('id', ParseIntPipe) id: number,
  @Body() updateCraDto: UpdateCraDto,
) {
  return this.craService.update(id, req.user.id, updateCraDto);
}

  @Roles(UserRole.COLLABORATEUR)
@Post(':id/submit')
submit(
  @Req() req: AuthenticatedRequest,
  @Param('id', ParseIntPipe) id: number,
) {
  return this.craService.submit(id, req.user.id);
}

  @Roles(UserRole.CLIENT)
  @Post(':id/client-validate')
  validateClient(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.craService.validateClient(id, req.user.id);
  }

  @Roles(UserRole.CLIENT)
  @Post(':id/client-refuse')
  refuseClient(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() refuseCraDto: RefuseCraDto,
  ) {
    return this.craService.refuseClient(id, req.user.id, refuseCraDto);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/admin-validate')
  validateAdmin(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.craService.validateAdmin(id, req.user.id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/admin-refuse')
  refuseAdmin(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() refuseCraDto: RefuseCraDto,
  ) {
    return this.craService.refuseAdmin(id, req.user.id, refuseCraDto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/archive')
  archive(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    return this.craService.archive(id);
  }

  @Roles(UserRole.COLLABORATEUR)
@Delete(':id')
remove(
  @Req() req: AuthenticatedRequest,
  @Param('id', ParseIntPipe) id: number,
) {
  return this.craService.remove(id, req.user.id);
}
}