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

@Entity('movimientos')
export class Movimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  cantidad: number;

  @Column()
  origenId: number;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'origenId' })
  origen: Location;

  @Column()
  destinoId: number;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'destinoId' })
  destino: Location;

  @Column()
  usuarioId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  @Column({ nullable: true })
  observacion: string | null;
}