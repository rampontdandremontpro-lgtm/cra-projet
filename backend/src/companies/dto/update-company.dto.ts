import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nom?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}