import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Location } from './location.entity';
import type { UserRole } from '../common/constants';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'varchar' })
  rol: UserRole;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tiendaId' })
  tienda: Location | null;

  @Column({ type: 'int', nullable: true })
  tiendaId: number | null;

  /** Apellido del personal. Nullable: los usuarios previos al Hito 3 solo tienen `nombre`. */
  @Column({ type: 'varchar', nullable: true })
  apellido: string | null;

  /** Vector de identidad facial (512 floats normalizados). Lo produce `FaceService` in-process; null = sin rostro registrado. */
  @Column({ type: 'jsonb', nullable: true })
  embedding: number[] | null;

  /** Ruta del objeto de la foto de referencia en el bucket privado `faces` (`user-<id>.jpg`), no una URL: las firmadas expiran. */
  @Column({ type: 'text', nullable: true })
  facePhoto: string | null;

  @Column({ type: 'timestamp', nullable: true })
  faceRegisteredAt: Date | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
