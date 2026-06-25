import { IsDateString, IsInt, IsNotEmpty } from 'class-validator';

export class CreateCollaboratorAssignmentDto {
  @IsInt()
  collaboratorId: number;

  @IsInt()
  serviceId: number;

  @IsInt()
  assignedByUserId: number;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;
}