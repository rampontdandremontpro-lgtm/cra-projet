import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateServiceDto {
  @IsInt()
  companyId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nom: string;
}