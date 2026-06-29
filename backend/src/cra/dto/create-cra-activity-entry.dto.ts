import {
  IsInt,
  IsNumber,
  Max,
  Min,
} from 'class-validator';

export class CreateCraActivityEntryDto {
  @IsInt()
  @Min(0)
  activityColumnIndex: number;

  @IsNumber()
  @Min(0.1)
  @Max(1)
  duree: number;
}