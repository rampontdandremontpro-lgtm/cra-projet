import {
  IsArray,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CreateCraActivityColumnDto } from './create-cra-activity-column.dto';
import { CreateCraDayDto } from './create-cra-day.dto';

export class UpdateCraDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  mois?: number;

  @IsOptional()
  @IsInt()
  @Min(2025)
  annee?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCraActivityColumnDto)
  activityColumns?: CreateCraActivityColumnDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCraDayDto)
  days?: CreateCraDayDto[];
}