import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCraActivityColumnDto {
  @IsString()
  @MaxLength(100)
  nom: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}