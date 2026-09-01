import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { Location } from './location.entity';
import { User } from './user.entity';
import { Sale } from './sale.entity';

@Entity('devoluciones')
export class Devolucion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  @Column()
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int', nullable: true })
  ventaId: number | null;

  @ManyToOne(() => Sale, { nullable: true })
  @JoinColumn({ name: 'ventaId' })
  venta: Sale | null;

  @Column({ type: 'int', nullable: true })
  saleItemId: number | null;

  @Column()
  motivo: string;

  @Column()
  cantidad: number;

  @Column({ type: 'float' })
  monto: number;

  @Column()
  metodo: string;

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
}
