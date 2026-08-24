import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type TipoUbicacion = 'almacen' | 'tienda';

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column()
  tipo: TipoUbicacion;

  @Column()
  numero: number;

  @Column({ unique: true })
  codigo: string;

  @Column({ type: 'varchar', nullable: true })
  ubicacion: string | null;

  @Column({ type: 'varchar', nullable: true })
  horarios: string | null;

  @Column({ type: 'varchar', nullable: true })
  contacto: string | null;
}
