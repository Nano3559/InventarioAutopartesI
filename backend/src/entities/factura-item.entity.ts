import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Factura } from './factura.entity';
import { Location } from './location.entity';

@Entity('factura_items')
export class FacturaItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  facturaId: number;

  @ManyToOne(() => Factura, (factura) => factura.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'facturaId' })
  factura: Factura;

  @Column()
  codigoFabrica: string;

  @Column()
  producto: string;

  @Column()
  marca: string;

  @Column()
  modelo: string;

  @Column({ type: 'varchar', nullable: true })
  anio: string | null;

  @Column({ type: 'varchar', nullable: true })
  detalle: string | null;

  @Column({ type: 'float', default: 0 })
  costo: number;

  @Column({ type: 'int', default: 0 })
  cantidad: number;

  @Column()
  almacenId: number;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'almacenId' })
  almacen: Location;
}
