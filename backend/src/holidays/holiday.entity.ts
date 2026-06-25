import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('holidays')
export class Holiday {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', unique: true, nullable: false })
  date: string;

  @Column({ type: 'varchar', length: 150, nullable: false })
  nom: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  zone: string;
}