import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { CraDayType } from '../cra-day.entity';

export class UpdateCraDayDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(CraDayType)
  type?: CraDayType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  duree?: number;

  @IsOptional()
  @IsString()
  commentaire?: string;
}