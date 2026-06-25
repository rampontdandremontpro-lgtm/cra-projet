import {
  IsArray,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { UpdateCraDayDto } from './update-cra-day.dto';

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
  @Type(() => UpdateCraDayDto)
  days?: UpdateCraDayDto[];
}