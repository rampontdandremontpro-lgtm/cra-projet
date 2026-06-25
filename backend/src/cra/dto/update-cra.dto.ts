import { CraStatus } from '../cra.entity';
import { CreateCraDayDto } from './create-cra-day.dto';

export class UpdateCraDto {
  collaborateur_id?: number;
  service_id?: number;
  mois?: number;
  annee?: number;
  statut?: CraStatus;
  jours?: CreateCraDayDto[];
}