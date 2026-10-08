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

export interface AttendanceDashboardFilters {
  /** `YYYY-MM-DD`. Sin valor: el día local del servidor. */
  fecha?: string;
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

/**
 * Día local (00:00:00.000 → 23:59:59.999) a partir de `YYYY-MM-DD`.
 * Se arma con `new Date(y, m-1, d)` y no con `new Date('2026-10-03')` a propósito:
 * la forma ISO se parsea como **medianoche UTC**, que en Bolivia (UTC-4) es el día
 * anterior y dejaría el dashboard corrido un día.
 */
function rangoDelDia(fecha?: string): {
  inicio: Date;
  fin: Date;
  etiqueta: string;
} {
  const hoy = new Date();
  const iso = fecha?.trim();
  let dia: Date;
  if (!iso) {
    dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  } else {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      throw new BadRequestException(
        `fecha inválida: "${iso}". Se espera YYYY-MM-DD`,
      );
    }
    const [anio, mes, diaNumero] = iso.split('-').map(Number);
    dia = new Date(anio, mes - 1, diaNumero);
    // `new Date(2026, 12, 1)` no falla: rueda a enero de 2027. El round-trip
    // detecta eso y el 31 de febrero, que JS normaliza al 3 de marzo.
    if (
      dia.getFullYear() !== anio ||
      dia.getMonth() !== mes - 1 ||
      dia.getDate() !== diaNumero
    ) {
      throw new BadRequestException(`fecha inválida: ${iso}`);
    }
  }
  const fin = new Date(dia);
  fin.setDate(fin.getDate() + 1);
  fin.setTime(fin.getTime() - 1);
  return {
    inicio: dia,
    fin,
    etiqueta: `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`,
  };
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

  /**
   * Presentes / ausentes por tienda para un día (tarea B5, la pantalla de M5).
   *
   * - `presentes`: quienes tengan **al menos un marcaje** ese día.
   * - `dentro`: el último marcaje del día fue `entrada` (o sea, siguen en el local).
   * - La tienda del presente es la del **último marcaje**; si ese marcaje no trae
   *   tienda se usa la asignada en `users.tiendaId`. Los ausentes se cuentan sobre
   *   el personal activo asignado a cada tienda, así ambos grupos son comparables.
   *
   * El rango es el **día local** del servidor, igual que `determinarTipoAutomatico`.
   */
  async dashboard(filters: AttendanceDashboardFilters) {
    const { inicio, fin, etiqueta } = rangoDelDia(
      filters.fecha?.trim() || undefined,
    );

    const [marcajes, usuarios, locations, filasConRostro] = await Promise.all([
      this.baseQuery()
        .where('a.fecha BETWEEN :inicio AND :fin', { inicio, fin })
        .orderBy('a.fecha', 'ASC')
        .addOrderBy('a.id', 'ASC')
        .getMany(),
      // Columnas explícitas: `find()` traería `password` y el `embedding` (512 floats
      // de dato biométrico) a la memoria del proceso sin ningún uso.
      this.usuariosRepo
        .createQueryBuilder('u')
        .select([
          'u.id',
          'u.nombre',
          'u.apellido',
          'u.email',
          'u.rol',
          'u.tiendaId',
        ])
        .where('u.activo = true')
        .orderBy('u.id', 'ASC')
        .getMany(),
      this.locationsRepo.find({ order: { numero: 'ASC' } }),
      this.usuariosRepo
        .createQueryBuilder('u')
        .select(['u.id'])
        .where('u.embedding IS NOT NULL')
        .andWhere('u.activo = true')
        .getMany(),
    ]);
    const conRostro = new Set(filasConRostro.map((u) => u.id));

    const porUsuario = new Map<number, Asistencia[]>();
    for (const m of marcajes) {
      const lista = porUsuario.get(m.usuarioId) ?? [];
      lista.push(m);
      porUsuario.set(m.usuarioId, lista);
    }

    type FilaPresente = Record<string, unknown> & { usuarioId: number };
    type FilaAusente = {
      usuarioId: number;
      nombre: string | null;
      apellido: string | null;
      nombreCompleto: string;
      email: string;
      rol: string;
      rostroRegistrado: boolean;
    };
    type Grupo = {
      locationId: number | null;
      codigo: string | null;
      nombre: string;
      tipo: string | null;
      totalPersonal: number;
      totalMarcajes: number;
      presentes: FilaPresente[];
      ausentes: FilaAusente[];
    };

    const grupos = new Map<number | null, Grupo>();
    const grupoDe = (locationId: number | null): Grupo => {
      let grupo = grupos.get(locationId);
      if (!grupo) {
        const location = locations.find((l) => l.id === locationId);
        grupo = {
          locationId,
          codigo: location?.codigo ?? null,
          nombre: location?.nombre ?? 'Sin tienda asignada',
          tipo: location?.tipo ?? null,
          totalPersonal: 0,
          totalMarcajes: 0,
          presentes: [],
          ausentes: [],
        };
        grupos.set(locationId, grupo);
      }
      return grupo;
    };

    const resumen = (u: {
      id: number;
      nombre: string;
      apellido: string | null;
      email: string;
      rol: string;
    }) => ({
      usuarioId: u.id,
      nombre: u.nombre,
      apellido: u.apellido,
      nombreCompleto: [u.nombre, u.apellido].filter(Boolean).join(' '),
      email: u.email,
      rol: u.rol,
    });

    let presentes = 0;
    let dentro = 0;

    for (const u of usuarios) {
      const filas = porUsuario.get(u.id) ?? [];
      if (!filas.length) {
        const grupo = grupoDe(u.tiendaId ?? null);
        grupo.ausentes.push({
          ...resumen(u),
          rostroRegistrado: conRostro.has(u.id),
        });
        grupo.totalPersonal++;
        continue;
      }
      presentes++;
      const ultima = filas[filas.length - 1];
      const estaDentro = ultima.tipo === 'entrada';
      if (estaDentro) dentro++;

      const iEntrada = filas.findIndex((f) => f.tipo === 'entrada');
      const iUltimaEntrada = filas.map((f) => f.tipo).lastIndexOf('entrada');
      const iUltimaSalida = filas.map((f) => f.tipo).lastIndexOf('salida');
      const ultimaSalida =
        iUltimaSalida > iUltimaEntrada ? filas[iUltimaSalida] : null;

      const grupo = grupoDe(ultima.locationId ?? u.tiendaId ?? null);
      grupo.presentes.push({
        ...resumen(u),
        presencia: 'presente',
        dentro: estaDentro,
        horaEntrada: iEntrada >= 0 ? filas[iEntrada].fecha.toISOString() : null,
        horaSalida: ultimaSalida ? ultimaSalida.fecha.toISOString() : null,
        ultimaMarca: {
          asistenciaId: ultima.id,
          tipo: ultima.tipo,
          fecha: ultima.fecha.toISOString(),
          metodo: ultima.metodo,
          confianza: ultima.confianza,
        },
        marcajes: filas.length,
        rostroRegistrado: conRostro.has(u.id),
      });
      grupo.totalPersonal++;
    }

    const porTienda: Grupo[] = [...grupos.values()]
      .filter((g) => g.locationId !== null)
      .sort((a, b) => (a.codigo ?? '').localeCompare(b.codigo ?? ''));
    const sinTienda = grupos.get(null) ?? {
      locationId: null,
      codigo: null,
      nombre: 'Sin tienda asignada',
      tipo: null,
      totalPersonal: 0,
      totalMarcajes: 0,
      presentes: [],
      ausentes: [],
    };
    for (const grupo of grupos.values()) {
      grupo.totalMarcajes = grupo.presentes.reduce(
        (n, p) => n + (p.marcajes as number),
        0,
      );
    }

    return {
      fecha: etiqueta,
      desde: inicio.toISOString(),
      hasta: fin.toISOString(),
      totales: {
        personal: usuarios.length,
        presentes,
        ausentes: usuarios.length - presentes,
        dentro,
        fuera: presentes - dentro,
        marcajes: marcajes.length,
        entradas: marcajes.filter((m) => m.tipo === 'entrada').length,
        salidas: marcajes.filter((m) => m.tipo === 'salida').length,
        rostrosRegistrados: conRostro.size,
      },
      porTienda,
      sinTienda,
      ultimosMarcajes: marcajes
        .slice(-10)
        .reverse()
        .map((m) => this.presentar(m)),
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

  /**
   * Verifica rostro → reconoce y registra marcaje automático o devuelve candidatos.
   *
   * Con `usuarioId` se **salta el reconocimiento**: el operador ya eligió a quién
   * pertenece la foto (es el camino de "no reconocido" → elegir el nombre a mano,
   * la UX de R4). Se registra `metodo: 'manual'`, sin confianza, con el admin que
   * confirma en `confirmadoPorId`, y sin correr ArcFace: la foto se ignora.
   */
  async check(
    file: Express.Multer.File,
    tipo?: TipoAsistencia,
    locationId?: number | null,
    usuarioId?: number | null,
    actorId?: number | null,
  ) {
    if (tipo !== undefined && !TIPOS_ASISTENCIA.includes(tipo)) {
      throw new BadRequestException(
        `tipo inválido: ${tipo}. Valores: ${TIPOS_ASISTENCIA.join(', ')}`,
      );
    }
    if (locationId !== null && locationId !== undefined) {
      enteroPositivo(locationId, 'locationId');
      this.asegurar(
        await this.locationsRepo.existsBy({ id: locationId }),
        locationId,
        'locationId',
      );
    }

    if (usuarioId !== null && usuarioId !== undefined) {
      return this.registrarManual(usuarioId, tipo, locationId, actorId);
    }

    const embedding = await this.faceService.embeddingDeFoto(file);
    const candidatos = await this.faceService.buscar(embedding, 5);
    if (!candidatos.length) {
      return {
        reconocido: false,
        requiereConfirmacion: false,
        umbral: UMBRAL_CONFIANZA_FACIAL,
        candidatos: [],
      };
    }
    const mejor = candidatos[0];
    const segundo = candidatos.length > 1 ? candidatos[1] : null;
    const margenSeguridad = segundo ? mejor.similitud - segundo.similitud : 1;

    // Si ni el mejor candidato alcanza una similitud mínima creíble (0.55),
    // es un rostro desconocido: no se debe sugerir a ningún empleado.
    if (mejor.similitud < 0.55) {
      return {
        reconocido: false,
        requiereConfirmacion: false,
        umbral: UMBRAL_CONFIANZA_FACIAL,
        candidatos: [],
      };
    }

    // Reconocimiento seguro: supera el umbral y se separa claramente de otros candidatos
    if (mejor.similitud >= UMBRAL_CONFIANZA_FACIAL && margenSeguridad >= 0.08) {
      const usuario = await this.usuariosRepo.findOne({
        where: { id: mejor.usuarioId, activo: true },
      });
      if (!usuario) {
        return {
          reconocido: false,
          requiereConfirmacion: false,
          umbral: UMBRAL_CONFIANZA_FACIAL,
          candidatos: [],
        };
      }
      const fecha = new Date();
      const tipoFinal =
        tipo ?? (await this.determinarTipoAutomatico(usuario.id, fecha));
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
        manual: false,
        requiereConfirmacion: false,
        umbral: UMBRAL_CONFIANZA_FACIAL,
        candidato: {
          usuarioId: usuario.id,
          nombreCompleto: [usuario.nombre, usuario.apellido]
            .filter(Boolean)
            .join(' '),
          similitud: mejor.similitud,
        },
        asistencia: completa,
      };
    }

    // Coincidencia parcial que requiere confirmación (solo candidatos plausibles >= 0.55)
    return {
      reconocido: false,
      requiereConfirmacion: true,
      umbral: UMBRAL_CONFIANZA_FACIAL,
      candidatos: candidatos.filter((c) => c.similitud >= 0.55),
    };
  }

  /**
   * Marcaje que el operador asignó a mano (reconocimiento por debajo del umbral o
   * ninguna coincidencia). Mismo tipo automático que el camino automático.
   */
  private async registrarManual(
    usuarioId: number,
    tipo: TipoAsistencia | undefined,
    locationId: number | null | undefined,
    actorId: number | null | undefined,
  ) {
    enteroPositivo(usuarioId, 'usuarioId');
    const usuario = await this.usuariosRepo.findOne({
      where: { id: usuarioId, activo: true },
    });
    if (!usuario) {
      throw new NotFoundException(
        `usuarioId ${usuarioId} no existe o está dado de baja (activo = false)`,
      );
    }
    const fecha = new Date();
    const tipoFinal =
      tipo ?? (await this.determinarTipoAutomatico(usuario.id, fecha));
    const guardada = await this.asistenciaRepo.save(
      this.asistenciaRepo.create({
        usuarioId: usuario.id,
        locationId: locationId ?? null,
        fecha,
        tipo: tipoFinal,
        metodo: 'manual',
        confianza: null,
        confirmadoPorId: actorId ?? null,
      }),
    );
    return {
      reconocido: true,
      manual: true,
      requiereConfirmacion: false,
      umbral: UMBRAL_CONFIANZA_FACIAL,
      candidato: {
        usuarioId: usuario.id,
        nombreCompleto: [usuario.nombre, usuario.apellido]
          .filter(Boolean)
          .join(' '),
        similitud: null,
      },
      asistencia: await this.findOne(guardada.id),
    };
  }

  /** Confirmación manual cuando el reconocimiento es bajo umbral. */
  async confirmarManual(id: number, actorId: number) {
    const asistencia = await this.asistenciaRepo.findOne({ where: { id } });
    if (!asistencia)
      throw new NotFoundException(`Asistencia ${id} no encontrada`);
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
