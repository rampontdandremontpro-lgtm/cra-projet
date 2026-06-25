import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RefuseCraDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  motif: string;
}