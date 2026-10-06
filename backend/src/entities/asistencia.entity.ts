import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Location } from './location.entity';
import type { MetodoAsistencia, TipoAsistencia } from '../common/constants';

@Entity('asistencia')
@Index('IX_asistencia_fecha', ['fecha'])
@Index('IX_asistencia_usuario_fecha', ['usuarioId', 'fecha'])
export class Asistencia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  usuarioId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  /** Tienda (de las 7 ubicaciones) donde se realizó el marcaje. */
  @Column({ type: 'int', nullable: true })
  locationId: number | null;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'locationId' })
  location: Location | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  @Column({ type: 'varchar' })
  tipo: TipoAsistencia;

  /** Similitud del reconocimiento en POST /attendance/check (0-1). Null si fue manual. */
  @Column({ type: 'double precision', nullable: true })
  confianza: number | null;

  @Column({ type: 'varchar', default: 'automatico' })
  metodo: MetodoAsistencia;

  /** Usuario que confirmó el marcaje cuando la confianza quedó por debajo del umbral. */
  @Column({ type: 'int', nullable: true })
  confirmadoPorId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'confirmadoPorId' })
  confirmadoPor: User | null;
}
