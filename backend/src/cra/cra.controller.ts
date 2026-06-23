import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import { CraService } from './cra.service';
import { CreateCraDto } from './dto/create-cra.dto';
import { UpdateCraDto } from './dto/update-cra.dto';
import { ClientRefuseCraDto } from './dto/client-refuse-cra.dto';
import { AdminRefuseCraDto } from './dto/admin-refuse-cra.dto';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('cra')
export class CraController {
  constructor(private readonly craService: CraService) {}

  @Post()
create(@Body() createCraDto: CreateCraDto, @Req() req) {
  return this.craService.create(createCraDto, req.user.sub);
}

@Get()
findAll(@Req() req) {
  return this.craService.findByCollaborateur(req.user.sub);
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

  @Post('check')
checkCraBeforeSubmit(@Body() createCraDto: CreateCraDto) {
  return this.craService.checkCraBeforeSubmit(createCraDto);
}

  @Post(':id/submit')
submit(@Param('id') id: string) {
  return this.craService.submit(Number(id));
}

@Post(':id/validate-client')
validateClient(@Param('id') id: string) {
  return this.craService.validateClient(Number(id));
}

@Post(':id/refuse-client')
refuseClient(
  @Param('id') id: string,
  @Body() clientRefuseCraDto: ClientRefuseCraDto,
) {
  return this.craService.refuseClient(
    Number(id),
    clientRefuseCraDto.motif_refus_client,
  );
}

@Post(':id/validate-admin')
validateAdmin(@Param('id') id: string) {
  return this.craService.validateAdmin(Number(id));
}

@Post(':id/refuse-admin')
refuseAdmin(
  @Param('id') id: string,
  @Body() adminRefuseCraDto: AdminRefuseCraDto,
) {
  return this.craService.refuseAdmin(
    Number(id),
    adminRefuseCraDto.motif_refus_admin,
  );
}

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.craService.remove(Number(id));
  }

  @Get(':id/pdf')
async generatePdf(@Param('id') id: string, @Res() res: Response) {
  const pdfBuffer = await this.craService.generatePdf(Number(id));

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="cra-${id}.pdf"`,
    'Content-Length': pdfBuffer.length,
  });

  res.end(pdfBuffer);
}
}