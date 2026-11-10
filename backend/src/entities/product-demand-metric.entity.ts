import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Product } from './product.entity';
import { Location } from './location.entity';

@Entity('product_demand_metrics')
@Unique(['productId', 'locationId'])
export class ProductDemandMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true })
  locationId: number | null;

  @ManyToOne(() => Location, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'locationId' })
  location: Location | null;

  @Column({ default: 0 })
  unidadesVendidas: number;

  @Column({ default: 0 })
  unidadesDevueltas: number;

  @Column({ default: 1 })
  diasConStock: number;

  @Column({ type: 'float', default: 0 })
  demandaDiaria: number;

  @Column({ type: 'float', default: 0 })
  rotacionDias: number;

  @Column({ type: 'float', default: 0 })
  gmroi: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
