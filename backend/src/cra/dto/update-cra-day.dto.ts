import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CraDayType } from '../cra-day.entity';
import { CreateCraActivityEntryDto } from './create-cra-activity-entry.dto';

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCraActivityEntryDto)
  activityEntries?: CreateCraActivityEntryDto[];
}