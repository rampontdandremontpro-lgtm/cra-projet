import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateHolidayDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nom: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  zone: string;
}