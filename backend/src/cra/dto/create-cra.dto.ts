import { CreateCraDayDto } from './create-cra-day.dto';

export class CreateCraDto {
  collaborateur_id: number;
  client_id: number;
  mois: number;
  annee: number;
  jours?: CreateCraDayDto[];
}