import { UserRole } from '../user.entity';

export class CreateUserDto {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  role: UserRole;
  is_active?: boolean;
}