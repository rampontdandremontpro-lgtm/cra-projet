import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateHolidayDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  zone?: string;
}