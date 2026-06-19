import { UserRole } from '../user.entity';

export class UpdateUserDto {
  nom?: string;
  prenom?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  is_active?: boolean;
}