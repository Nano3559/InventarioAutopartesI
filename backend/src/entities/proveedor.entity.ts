import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('proveedores')
export class Proveedor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ default: 'Bolivia' })
  pais: string;

  @Column({ nullable: true })
  contacto: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}