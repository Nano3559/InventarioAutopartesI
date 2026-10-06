import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull, Not } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { FaceService } from '../face/face.service';
import { ARCFACE_DIMENSION } from '../face/face-embedding';
import {
  FOTOS_MAXIMO_REGISTRO,
  FOTOS_MINIMO_REGISTRO,
  FOTOS_RECOMENDADAS_REGISTRO,
  USER_ROLES,
} from '../common/constants';
import type { UserRole } from '../common/constants';

@Injectable()
export class UsersService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private readonly face: FaceService,
  ) {}

  private repo() {
    return this.dataSource.getRepository(User);
  }

  /**
   * Nunca se devuelve el `embedding`: son 512 floats de dato biométrico
   * (Ley 26935) y ningún cliente los necesita. `facePhoto` sí viaja, pero es la
   * ruta del objeto en el bucket privado, no una URL pública.
   */
  private seguro(user: User) {
    const { password, embedding, ...rest } = user;
    void password;
    void embedding;
    return { ...rest, nombreCompleto: nombreCompleto(user) };
  }

  async findAll() {
    const users = await this.repo().find({
      relations: { tienda: true },
      order: { id: 'ASC' },
    });
    return users.map((u) => this.seguro(u));
  }

  async create(data: {
    nombre: string;
    apellido?: string;
    email: string;
    password: string;
    rol: string;
    tiendaId?: number | null;
    activo?: boolean;
  }) {
    if (!USER_ROLES.includes(data.rol as UserRole)) {
      throw new BadRequestException('Rol inválido');
    }
    const exists = await this.repo().findOne({
      where: { email: data.email.toLowerCase() },
    });
    if (exists) throw new BadRequestException('El email ya está registrado');
    const user = this.repo().create({
      nombre: data.nombre,
      apellido: data.apellido?.trim() || null,
      email: data.email.toLowerCase(),
      password: await bcrypt.hash(data.password, 10),
      rol: data.rol as UserRole,
      tiendaId: data.tiendaId ?? null,
      activo: data.activo ?? true,
    });
    const saved = await this.repo().save(user);
    return this.seguro(saved);
  }

  async update(
    id: number,
    data: {
      nombre?: string;
      apellido?: string | null;
      email?: string;
      password?: string;
      rol?: string;
      tiendaId?: number | null;
      activo?: boolean;
      /** Derecho de baja biométrico: borra embedding, foto y fecha de registro. */
      eliminarEmbedding?: boolean;
    },
  ) {
    const user = await this.repo().findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (data.rol && !USER_ROLES.includes(data.rol as UserRole)) {
      throw new BadRequestException('Rol inválido');
    }
    if (data.nombre !== undefined) user.nombre = data.nombre;
    if (data.apellido !== undefined)
      user.apellido = data.apellido?.trim() || null;
    if (data.email !== undefined) user.email = data.email.toLowerCase();
    if (data.rol !== undefined) user.rol = data.rol as UserRole;
    if (data.tiendaId !== undefined) user.tiendaId = data.tiendaId;
    if (data.activo !== undefined) user.activo = data.activo;
    if (data.password) {
      user.password = await bcrypt.hash(data.password, 10);
    }

    if (data.eliminarEmbedding) {
      const fotoPrevia = user.facePhoto;
      user.embedding = null;
      user.facePhoto = null;
      user.faceRegisteredAt = null;
      this.face.quitarDelIndice(user.id);
      if (fotoPrevia) await this.face.borrarFotoRostro(fotoPrevia);
    }

    const saved = await this.repo().save(user);
    // Un usuario dado de baja no debe seguir en el índice de rostros.
    if (!saved.activo) this.face.quitarDelIndice(saved.id);
    return this.seguro(saved);
  }

  async remove(id: number) {
    const user = await this.repo().findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    this.face.quitarDelIndice(user.id);
    await this.repo().remove(user);
    return { ok: true };
  }

  // ------------------------------------------------------ registro facial (B3)

  /**
   * Asocia un rostro a un usuario **que ya existe** en `users`: el formulario
   * envía `nombre` + `apellido` y el endpoint no crea personal (el requerimiento
   * dice "conforme a la base de datos").
   *
   * - 0 coincidencias → 404 con el nombre buscado
   * - >1 coincidencias → 409 con los candidatos, para que el operador elija
   *   (el plan avisa del solapamiento de nombres; el `email`/`rol` desambigua)
   * - usuario dado de baja (`activo = false`) → 409
   */
  private async resolverPorNombre(
    nombre: string,
    apellido: string,
  ): Promise<{ usuario: User; exacto: boolean }> {
    const repo = this.repo();

    const exactos = await repo
      .createQueryBuilder('u')
      .where('u.nombre ILIKE :nombre', { nombre })
      .andWhere('u.apellido ILIKE :apellido', { apellido })
      .getMany();
    if (exactos.length === 1) return { usuario: exactos[0], exacto: true };
    if (exactos.length > 1) this.ambiguos(exactos);

    // Segundo intento, más tolerante: parcial ("Mar" en vez de "María") y usuarios
    // que aún no tienen `apellido` cargado en la BD (los del seed, por ejemplo).
    // Ojo: acá el `nombre` va con comodines. Reusar la condición exacta del primer
    // intento dejaba esta búsqueda muerta, porque 'Brian Admin' ILIKE 'Brian' es falso.
    const candidatos = await repo
      .createQueryBuilder('u')
      .where('u.nombre ILIKE :parcial', {
        parcial: `%${escaparLike(nombre)}%`,
      })
      .andWhere('(u.apellido ILIKE :apellido OR u.apellido IS NULL)', {
        apellido: `%${escaparLike(apellido)}%`,
      })
      .getMany();

    if (candidatos.length === 1)
      return { usuario: candidatos[0], exacto: false };
    if (candidatos.length > 1) this.ambiguos(candidatos);

    throw new NotFoundException({
      message:
        `No existe un usuario con nombre "${nombre}" y apellido "${apellido}". ` +
        'El registro facial solo funciona con personal ya creado en users.',
      sugerencias: await this.sugerenciasSimilares(nombre, apellido),
    });
  }

  private ambiguos(candidatos: User[]): never {
    throw new ConflictException({
      message:
        'Hay más de un usuario con ese nombre: indicá cuál es antes de registrar el rostro',
      candidatos: candidatos.map((u) => this.resumen(u)),
    });
  }

  /**
   * Aproximaciones al nombre escrito, para el 404. Sin esto, el operador que
   * escribió "Marcos Salinas" y tiene en la BD a "Marco Antonio Salinas" se queda
   * con un texto genérico y tiene que ir a buscar el usuario a mano.
   */
  private async sugerenciasSimilares(nombre: string, apellido: string) {
    const coincidencias = await this.repo()
      .createQueryBuilder('u')
      .where('(u.nombre ILIKE :nombre OR u.apellido ILIKE :apellido)', {
        nombre: `%${escaparLike(nombre)}%`,
        apellido: `%${escaparLike(apellido)}%`,
      })
      .orderBy('u.nombre', 'ASC')
      .addOrderBy('u.apellido', 'ASC')
      .take(5)
      .getMany();
    return coincidencias.map((u) => this.resumen(u));
  }

  private resumen(u: User) {
    return {
      id: u.id,
      nombreCompleto: nombreCompleto(u),
      email: u.email,
      rol: u.rol,
      tieneRostro: Boolean(u.embedding),
      activo: u.activo,
    };
  }

  /**
   * `POST /users/face/register` — registra el rostro de un usuario existente.
   *
   * 1. Resuelve el usuario, por `usuarioId` si viene (elegido de la lista, sin
   *    ambigüedad) o por nombre + apellido (formulario a mano; 404 / 409).
   * 2. Preprocesa cada foto a 112x112 y corre ArcFace.
   * 3. **Promedia y normaliza** los N embeddings → `users.embedding`.
   * 4. Sube 1 foto al bucket privado `faces` → `facePhoto` + `faceRegisteredAt`.
   * 5. Rehidrata el índice en memoria (sin reiniciar el proceso).
   *
   * `usuarioId` gana sobre nombre/apellido: si vienen ambos, manda el id.
   */
  async registrarRostro(
    usuarioId: unknown,
    nombre: unknown,
    apellido: unknown,
    files: Express.Multer.File[] | undefined,
  ) {
    this.validarFotos(files);

    let usuario: User;
    let apellidoLimpio: string | null = null;
    let exacto = true;

    const idTexto = textoOpcional(usuarioId);
    if (idTexto !== null) {
      if (!/^\d+$/.test(idTexto)) {
        throw new BadRequestException(
          `El campo "usuarioId" debe ser un número (se recibió "${idTexto}")`,
        );
      }
      const encontrado = await this.repo().findOne({
        where: { id: Number(idTexto) },
      });
      if (!encontrado) {
        throw new NotFoundException(
          `No existe el usuario #${idTexto}. El registro facial solo funciona con personal ya creado en users.`,
        );
      }
      usuario = encontrado;
    } else {
      const nombreLimpio = textoRequerido(nombre, 'nombre');
      apellidoLimpio = textoRequerido(apellido, 'apellido');
      ({ usuario, exacto } = await this.resolverPorNombre(
        nombreLimpio,
        apellidoLimpio,
      ));
    }

    if (!usuario.activo) {
      throw new ConflictException(
        `El usuario ${usuario.email} está dado de baja (activo = false): no se puede registrar su rostro`,
      );
    }

    const reRegistro = Boolean(usuario.embedding);
    const embeddings = await this.face.embeddingsDeFotos(files);
    const embedding = this.face.embeddingConsolidado(embeddings);

    // La foto se sube después de la inferencia: si ArcFace falla no queda basura
    // en el bucket, y si la subida falla no se guarda un embedding sin foto.
    const fotoPrevia = usuario.facePhoto;
    const objeto = await this.face.subirFotoRostro(usuario.id, files[0]);

    // El `apellido` del formulario completa el que faltaba en la BD. Con
    // `usuarioId` no hay apellido escrito, así que no se toca.
    if (apellidoLimpio && !usuario.apellido) usuario.apellido = apellidoLimpio;
    usuario.embedding = embedding;
    usuario.facePhoto = objeto;
    usuario.faceRegisteredAt = new Date();

    const saved = await this.repo().save(usuario);
    this.face.upsertEnIndice(saved.id, embedding);
    if (fotoPrevia && fotoPrevia !== objeto) {
      await this.face.borrarFotoRostro(fotoPrevia);
    }

    const avisos: string[] = [];
    if (files.length < FOTOS_RECOMENDADAS_REGISTRO) {
      avisos.push(
        `Se registraron ${files.length} foto(s); se recomiendan ${FOTOS_RECOMENDADAS_REGISTRO} para un reconocimiento más seguro`,
      );
    }
    if (!exacto) {
      avisos.push(
        'El nombre no coincidió exactamente: se asoció por coincidencia parcial',
      );
    }
    if (reRegistro) {
      avisos.push('El usuario ya tenía un rostro registrado: se reemplazó');
    }

    return {
      id: saved.id,
      nombre: saved.nombre,
      apellido: saved.apellido,
      nombreCompleto: nombreCompleto(saved),
      email: saved.email,
      rol: saved.rol,
      faceRegisteredAt: saved.faceRegisteredAt,
      facePhoto: saved.facePhoto,
      fotoUrl: await this.face.urlFirmadaRostro(saved.facePhoto),
      fotosRegistradas: files.length,
      embeddingDimension: ARCFACE_DIMENSION,
      reconoce: reRegistro,
      avisos,
    };
  }

  /**
   * Valida el `fotos[]` del multipart. Se comprueba **antes** de resolver el
   * usuario para no gastar una búsqueda si el registro ya viene mal.
   * La firma de aserción deja `files` tipado como no-nulo después de la llamada.
   */
  private validarFotos(
    files: Express.Multer.File[] | undefined,
  ): asserts files is Express.Multer.File[] {
    if (!files?.length) {
      throw new BadRequestException(
        `Se requiere al menos ${FOTOS_MINIMO_REGISTRO} foto(s) del rostro en el campo "fotos"`,
      );
    }
    if (files.length > FOTOS_MAXIMO_REGISTRO) {
      throw new BadRequestException(
        `Se aceptan hasta ${FOTOS_MAXIMO_REGISTRO} fotos (se recibieron ${files.length})`,
      );
    }
  }

  /**
   * Rostros registrados (para la pantalla web de personal). Devuelve la URL firmada
   * de cada foto: el bucket `faces` es privado y nunca se expone una URL pública.
   */
  async listarRostros() {
    const conRostro = await this.repo().find({
      where: { embedding: Not(IsNull()) },
      order: { id: 'ASC' },
    });
    return Promise.all(
      conRostro.map(async (u) => ({
        id: u.id,
        nombre: u.nombre,
        apellido: u.apellido,
        nombreCompleto: nombreCompleto(u),
        email: u.email,
        rol: u.rol,
        activo: u.activo,
        faceRegisteredAt: u.faceRegisteredAt,
        fotoUrl: await this.face.urlFirmadaRostro(u.facePhoto),
      })),
    );
  }
}

function nombreCompleto(user: Pick<User, 'nombre' | 'apellido'>): string {
  return [user.nombre, user.apellido].filter(Boolean).join(' ');
}

/** `nombre` y `apellido` llegan como campos de texto del multipart. */
function textoRequerido(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || !valor.trim()) {
    throw new BadRequestException(`El campo "${campo}" es obligatorio`);
  }
  const limpio = valor.trim().replace(/\s+/g, ' ');
  if (limpio.length < 2) {
    throw new BadRequestException(
      `El campo "${campo}" debe tener al menos 2 caracteres`,
    );
  }
  return limpio;
}

/**
 * `usuarioId` viene como texto del multipart. `null` significa "no vino", que es
 * distinto de un string vacío: un campo en blanco cae al camino nombre/apellido
 * en vez de romper con un 400 de formato.
 */
function textoOpcional(valor: unknown): string | null {
  if (typeof valor === 'number') return String(valor);
  if (typeof valor !== 'string') return null;
  return valor.trim() || null;
}

/**
 * En la búsqueda parcial, `%` y `_` se tratan como texto literal: si el operador
 * los escribe, no deben convertirse comodines de `ILIKE`.
 */
function escaparLike(texto: string): string {
  return texto.replace(/[%_\\]/g, (c) => `\\${c}`);
}
