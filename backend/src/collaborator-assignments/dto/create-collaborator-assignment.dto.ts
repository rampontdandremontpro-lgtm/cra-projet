export class CreateCollaboratorAssignmentDto {
  collaborateur_id: number;
  service_id: number;
  start_date?: Date;
  end_date?: Date;
}