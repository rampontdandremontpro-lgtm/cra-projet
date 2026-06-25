import {
  IsArray,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CreateCraDayDto } from './create-cra-day.dto';

export class CreateCraDto {
  @IsInt()
  @Min(1)
  @Max(12)
  mois: number;

  @IsInt()
  @Min(2025)
  annee: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCraDayDto)
  days?: CreateCraDayDto[];
}