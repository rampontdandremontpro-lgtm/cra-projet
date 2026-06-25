import { Controller, Get, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { StatsService } from './stats.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Roles(UserRole.ADMIN)
  @Get('admin')
  getAdminStats() {
    return this.statsService.getAdminStats();
  }

  @Roles(UserRole.RH)
  @Get('rh')
  getRhStats() {
    return this.statsService.getRhStats();
  }
}