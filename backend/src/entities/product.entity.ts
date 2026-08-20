import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  producto: string;

  @Column()
  fabricante: string;

  @Column({ nullable: true })
  empresaFabricante: string | null;

  @Column()
  marca: string;

  @Column()
  modelo: string;

  @Column({ nullable: true })
  anio: string | null;

  @Column({ nullable: true })
  detalle: string | null;

  @Column({ nullable: true })
  codigoOem: string | null;

  @Column()
  codigoFabrica: string;

  @Column({ type: 'text', nullable: true })
  imagen: string | null;

  @Column({ nullable: true })
  imagenHash: string | null;

  @Column({ type: 'float', default: 0 })
  costo: number;

  @Column({ type: 'float', nullable: true })
  precio1: number | null;

  @Column({ type: 'float', nullable: true })
  precio2: number | null;

  @Column({ type: 'float', nullable: true })
  precioMayor: number | null;

  @Column({ default: 1 })
  stockMinimo: number;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
