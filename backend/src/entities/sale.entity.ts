import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Location } from './location.entity';
import { User } from './user.entity';
import { Cliente } from './cliente.entity';
import { SaleItem } from './sale-item.entity';
import { Payment } from './payment.entity';

export type TipoVenta = 'menor' | 'mayor';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  codigo: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  @Column({ default: 'menor' })
  tipo: TipoVenta;

  @Column({ type: 'float' })
  total: number;

  @Column({ default: false })
  requiereFactura: boolean;

  @Column({ nullable: true })
  lugarEntrega: string | null;

  @Column({ nullable: true })
  paraQuien: string | null;

  @Column()
  locationId: number;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'locationId' })
  location: Location;

  @Column()
  usuarioId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  @Column({ nullable: true })
  clienteId: number | null;

  @ManyToOne(() => Cliente, { nullable: true })
  @JoinColumn({ name: 'clienteId' })
  cliente: Cliente | null;

  @OneToMany(() => SaleItem, (s) => s.sale, { cascade: true })
  items: SaleItem[];

  @OneToMany(() => Payment, (p) => p.sale, { cascade: true })
  pagos: Payment[];
}