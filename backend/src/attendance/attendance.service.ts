import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Asistencia } from '../entities/asistencia.entity';
import { User } from '../entities/user.entity';
import { Location } from '../entities/location.entity';
import { FaceService } from '../face/face.service';
import {
  METODOS_ASISTENCIA,
  TIPOS_ASISTENCIA,
  UMBRAL_CONFIANZA_FACIAL,
} from '../common/constants';
import type { MetodoAsistencia, TipoAsistencia } from '../common/constants';

const LIMITE_PAGINA_MAX = 200;

export interface AttendanceFilters {
  page?: string;
  limit?: string;
  usuarioId?: string;
  locationId?: string;
  tipo?: string;
  metodo?: string;
  desde?: string;
  hasta?: string;
  search?: string;
}

export interface AttendanceUpdate {
  usuarioId?: number;
  locationId?: number | null;
  fecha?: string;
  tipo?: TipoAsistencia;
  metodo?: MetodoAsistencia;
  confianza?: number | null;
  confirmadoPorId?: number | null;
}

/** `2026-09-30` → `2026-09-30 00:00:00` en el formato de `timestamp` de Postgres. */
function aTimestamp(iso: string, finDeDia: boolean): string {
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const base = soloFecha
    ? `${iso}T${finDeDia ? '23:59:59.999' : '00:00:00.000'}`
    : iso;
  const fecha = new Date(base);
  if (Number.isNaN(fecha.getTime())) {
    throw new BadRequestException(`Fecha inválida: ${iso}`);
  }
  return soloFecha
    ? fecha.toISOString().slice(0, 23).replace('T', ' ')
    : fecha.toISOString();
}

function enteroPositivo(valor: unknown, nombre: string): number {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) {
    throw new BadRequestException(`${nombre} debe ser un entero positivo`);
  }
  return n;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Asistencia)
    private asistenciaRepo: Repository<Asistencia>,
    @InjectRepository(User)
    private usuariosRepo: Repository<User>,
    @InjectRepository(Location)
    private locationsRepo: Repository<Location>,
    private readonly faceService: FaceService,
  ) {}

  /**
   * Joins con selección explícita de columnas: `leftJoinAndSelect` traería
   * `users.password` y `users.embedding` a la respuesta.
   */
  private baseQuery() {
    return this.asistenciaRepo
      .createQueryBuilder('a')
      .leftJoin('a.usuario', 'u')
      .addSelect(['u.id', 'u.nombre', 'u.apellido', 'u.email', 'u.rol'])
      .leftJoin('a.location', 'l')
      .addSelect(['l.id', 'l.nombre', 'l.codigo', 'l.tipo'])
      .leftJoin('a.confirmadoPor', 'c')
      .addSelect(['c.id', 'c.nombre', 'c.apellido']);
  }

  async findAll(filters: AttendanceFilters) {
    const page = filters.page ? enteroPositivo(filters.page, 'page') : 1;
    const limit = filters.limit
      ? Math.min(enteroPositivo(filters.limit, 'limit'), LIMITE_PAGINA_MAX)
      : 25;

    const qb = this.baseQuery();

    if (filters.usuarioId)
      qb.andWhere('a."usuarioId" = :usuarioId', {
        usuarioId: enteroPositivo(filters.usuarioId, 'usuarioId'),
      });
    if (filters.locationId)
      qb.andWhere('a."locationId" = :locationId', {
        locationId: enteroPositivo(filters.locationId, 'locationId'),
      });
    if (filters.tipo) {
      if (!TIPOS_ASISTENCIA.includes(filters.tipo as TipoAsistencia)) {
        throw new BadRequestException(
          `tipo inválido: ${filters.tipo}. Valores: ${TIPOS_ASISTENCIA.join(', ')}`,
        );
      }
      qb.andWhere('a.tipo = :tipo', { tipo: filters.tipo });
    }
    if (filters.metodo) {
      if (!METODOS_ASISTENCIA.includes(filters.metodo as MetodoAsistencia)) {
        throw new BadRequestException(
          `metodo inválido: ${filters.metodo}. Valores: ${METODOS_ASISTENCIA.join(', ')}`,
        );
      }
      qb.andWhere('a.metodo = :metodo', { metodo: filters.metodo });
    }
    if (filters.desde)
      qb.andWhere('a.fecha >= :desde', {
        desde: aTimestamp(filters.desde, false),
      });
    if (filters.hasta)
      qb.andWhere('a.fecha <= :hasta', {
        hasta: aTimestamp(filters.hasta, true),
      });
    if (filters.search) {
      const s = `%${filters.search}%`;
      qb.andWhere(
        '(u.nombre ILIKE :s OR u.apellido ILIKE :s OR u.email ILIKE :s)',
        { s },
      );
    }

    const [data, total] = await qb
      .orderBy('a.fecha', 'DESC')
      .addOrderBy('a.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: data.map((a) => this.presentar(a)),
      total,
      page,
      limit,
      pages: Math.max(Math.ceil(total / limit), 1),
    };
  }

  /** Marcaje corregido a mano por un admin: reasignar persona, tienda, tipo o fecha. */
  async update(id: number, body: AttendanceUpdate, actorId: number) {
    const asistencia = await this.asistenciaRepo.findOne({ where: { id } });
    if (!asistencia)
      throw new NotFoundException(`Asistencia ${id} no encontrada`);

    if (body.tipo !== undefined) {
      if (!TIPOS_ASISTENCIA.includes(body.tipo)) {
        throw new BadRequestException(
          `tipo inválido: ${body.tipo}. Valores: ${TIPOS_ASISTENCIA.join(', ')}`,
        );
      }
      asistencia.tipo = body.tipo;
    }
    if (body.metodo !== undefined) {
      if (!METODOS_ASISTENCIA.includes(body.metodo)) {
        throw new BadRequestException(
          `metodo inválido: ${body.metodo}. Valores: ${METODOS_ASISTENCIA.join(', ')}`,
        );
      }
      asistencia.metodo = body.metodo;
    }
    if (body.confianza !== undefined) {
      if (
        body.confianza !== null &&
        (typeof body.confianza !== 'number' ||
          Number.isNaN(body.confianza) ||
          body.confianza < 0 ||
          body.confianza > 1)
      ) {
        throw new BadRequestException(
          'confianza debe ser un número entre 0 y 1, o null',
        );
      }
      asistencia.confianza = body.confianza;
    }
    // El tipo se valida ANTES de tocar la BD: si no, un id con el tipo equivocado
    // revienta el existsBy() con un 500 en vez de un 400.
    if (body.usuarioId !== undefined) {
      enteroPositivo(body.usuarioId, 'usuarioId');
      this.asegurar(
        await this.usuariosRepo.existsBy({ id: body.usuarioId }),
        body.usuarioId,
        'usuarioId',
      );
      asistencia.usuarioId = body.usuarioId;
    }
    if (body.locationId !== undefined) {
      if (body.locationId !== null) {
        enteroPositivo(body.locationId, 'locationId');
        this.asegurar(
          await this.locationsRepo.existsBy({ id: body.locationId }),
          body.locationId,
          'locationId',
        );
      }
      asistencia.locationId = body.locationId;
    }
    if (body.fecha !== undefined) {
      const fecha = new Date(body.fecha);
      if (Number.isNaN(fecha.getTime())) {
        throw new BadRequestException(`Fecha inválida: ${body.fecha}`);
      }
      asistencia.fecha = fecha;
    }
    if (body.confirmadoPorId !== undefined) {
      if (body.confirmadoPorId !== null) {
        enteroPositivo(body.confirmadoPorId, 'confirmadoPorId');
        this.asegurar(
          await this.usuariosRepo.existsBy({ id: body.confirmadoPorId }),
          body.confirmadoPorId,
          'confirmadoPorId',
        );
      }
      asistencia.confirmadoPorId = body.confirmadoPorId;
    }
    // Un marcaje manual no viene de /face/match: no hay similitud que reportar.
    if (asistencia.metodo === 'manual') {
      asistencia.confianza = null;
      // Si nadie lo confirmó explícitamente, el admin que edita es el confirmante.
      if (!asistencia.confirmadoPorId) asistencia.confirmadoPorId = actorId;
    }

    await this.asistenciaRepo.save(asistencia);
    return this.findOne(id);
  }

  async findOne(id: number) {
    const asistencia = await this.baseQuery()
      .where('a.id = :id', { id })
      .getOne();
    if (!asistencia)
      throw new NotFoundException(`Asistencia ${id} no encontrada`);
    return this.presentar(asistencia);
  }

  /** El id ya viene validado como entero; acá solo se comprueba que exista. */
  private asegurar(existe: boolean, id: number, nombre: string): void {
    if (!existe) throw new NotFoundException(`${nombre} ${id} no existe`);
  }

  /** Determina tipo automático (entrada/salida): primer registro del día → entrada, segundo → salida. */
  private async determinarTipoAutomatico(
    usuarioId: number,
    fechaBase: Date,
  ): Promise<TipoAsistencia> {
    const inicio = new Date(fechaBase);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fechaBase);
    fin.setHours(23, 59, 59, 999);
    const ultimo = await this.asistenciaRepo.findOne({
      where: {
        usuarioId,
        fecha: Between(inicio, fin),
      },
      order: { fecha: 'DESC', id: 'DESC' },
    });
    if (!ultimo) return 'entrada';
    if (ultimo.tipo === 'entrada') return 'salida';
    return 'entrada';
  }

  /** Verifica rostro → reconoce y registra marcaje automático o devuelve candidatos. */
  async check(
    file: Express.Multer.File,
    tipo?: TipoAsistencia,
    locationId?: number | null,
  ) {
    const embedding = await this.faceService.embeddingDeFoto(file);
    const candidatos = await this.faceService.buscar(embedding, 5);
    if (!candidatos.length) {
      return {
        reconocido: false,
        umbral: UMBRAL_CONFIANZA_FACIAL,
        candidatos: [],
      };
    }
    const mejor = candidatos[0];
    if (mejor.similitud >= UMBRAL_CONFIANZA_FACIAL) {
      const usuario = await this.usuariosRepo.findOne({
        where: { id: mejor.usuarioId, activo: true },
      });
      if (!usuario) {
        return {
          reconocido: false,
          umbral: UMBRAL_CONFIANZA_FACIAL,
          candidatos,
        };
      }
      const fecha = new Date();
      const tipoFinal = tipo ?? (await this.determinarTipoAutomatico(usuario.id, fecha));
      const asistencia = this.asistenciaRepo.create({
        usuarioId: usuario.id,
        locationId: locationId ?? null,
        fecha,
        tipo: tipoFinal,
        metodo: 'automatico',
        confianza: mejor.similitud,
      });
      const guardada = await this.asistenciaRepo.save(asistencia);
      const completa = await this.findOne(guardada.id);
      return {
        reconocido: true,
        requiereConfirmacion: false,
        umbral: UMBRAL_CONFIANZA_FACIAL,
        candidato: {
          usuarioId: usuario.id,
          nombreCompleto: [usuario.nombre, usuario.apellido].filter(Boolean).join(' '),
          similitud: mejor.similitud,
        },
        asistencia: completa,
      };
    }
    return {
      reconocido: false,
      requiereConfirmacion: true,
      umbral: UMBRAL_CONFIANZA_FACIAL,
      candidatos,
    };
  }

  /** Confirmación manual cuando el reconocimiento es bajo umbral. */
  async confirmarManual(id: number, actorId: number) {
    const asistencia = await this.asistenciaRepo.findOne({ where: { id } });
    if (!asistencia) throw new NotFoundException(`Asistencia ${id} no encontrada`);
    asistencia.metodo = 'manual';
    asistencia.confianza = null;
    asistencia.confirmadoPorId = actorId;
    await this.asistenciaRepo.save(asistencia);
    return this.findOne(id);
  }

  /** `apellido` es nullable (Hito 3), así que el nombre completo se arma acá. */
  private presentar(asistencia: Asistencia) {
    const { usuario, confirmadoPor, ...resto } = asistencia;
    return {
      ...resto,
      nombreCompleto: [usuario?.nombre, usuario?.apellido]
        .filter(Boolean)
        .join(' '),
      usuario: usuario ?? null,
      confirmadoPor: confirmadoPor
        ? {
            id: confirmadoPor.id,
            nombre: confirmadoPor.nombre,
            apellido: confirmadoPor.apellido,
          }
        : null,
    };
  }
}
