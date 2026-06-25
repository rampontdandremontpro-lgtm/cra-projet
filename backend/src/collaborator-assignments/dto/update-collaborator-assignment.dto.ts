import { IsBoolean, IsDateString, IsInt, IsOptional } from 'class-validator';

export class UpdateCollaboratorAssignmentDto {
  @IsOptional()
  @IsInt()
  serviceId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}