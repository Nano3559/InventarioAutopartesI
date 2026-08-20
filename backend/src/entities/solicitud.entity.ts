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

@Entity('solicitudes')
export class Solicitud {
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
  tiendaId: number;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'tiendaId' })
  tienda: Location;

  @Column({ nullable: true })
  origenId: number | null;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'origenId' })
  origen: Location | null;

  @Column()
  usuarioId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  @Column({ default: 'Pendiente' })
  estado: string;

  @Column({ default: false })
  auto: boolean;
}
