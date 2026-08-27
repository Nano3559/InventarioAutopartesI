import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Proveedor } from './proveedor.entity';
import { FacturaItem } from './factura-item.entity';

@Entity('facturas')
export class Factura {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  proveedorId: number;

  @ManyToOne(() => Proveedor)
  @JoinColumn({ name: 'proveedorId' })
  proveedor: Proveedor;

  @Column()
  numero: string;

  @Column({ type: 'float', default: 1 })
  tipoCambio: number;

  @Column({ type: 'float', default: 0 })
  porcentaje: number;

  @Column({ type: 'float', default: 0 })
  monto: number;

  @Column({ type: 'text', nullable: true })
  archivo: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  @OneToMany(() => FacturaItem, (item) => item.factura)
  items: FacturaItem[];
}
