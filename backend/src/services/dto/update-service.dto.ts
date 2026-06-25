import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateServiceDto {
  @IsOptional()
  @IsInt()
  companyId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nom?: string;
}