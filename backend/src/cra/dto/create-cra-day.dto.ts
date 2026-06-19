import { CraDayType } from '../cra-day.entity';

export class CreateCraDayDto {
  date: string;
  type: CraDayType;
  duree: number;
  commentaire?: string;
}