import {
  type ExecutionContext,
  type INestApplication,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AttendanceController } from '../src/attendance/attendance.controller';
import { AttendanceService } from '../src/attendance/attendance.service';
import { FaceService } from '../src/face/face.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import { Asistencia } from '../src/entities/asistencia.entity';
import { User } from '../src/entities/user.entity';
import { Location } from '../src/entities/location.entity';

/** HTTP real + servicio real, repositorios en memoria: no lee .env ni accede a BD. */
describe('POST /attendance/check: comparación estricta (HTTP aislado)', () => {
  let app: INestApplication;
  const face = { analizarRostro: jest.fn(), buscar: jest.fn() };
  const repo = { save: jest.fn(), create: jest.fn() };
  const users = { findOne: jest.fn() };
  const analisis = {
    embedding: [1],
    deteccionDisponible: true,
    rostroDetectado: true,
    score: 0.99,
    rostros: 1,
    estrategia: 'alineado',
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [
        AttendanceService,
        { provide: FaceService, useValue: face },
        { provide: getRepositoryToken(Asistencia), useValue: repo },
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(Location), useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest<{ user: { id: number } }>().user = {
            id: 1,
          };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = modulo.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    jest
      .spyOn(app.get(AttendanceService), 'findOne')
      .mockResolvedValue({ id: 42 } as never);
  });
  afterAll(async () => app.close());
  beforeEach(() => {
    jest.clearAllMocks();
    face.analizarRostro.mockResolvedValue(analisis);
    face.buscar.mockResolvedValue([{ usuarioId: 7, similitud: 0.3 }]);
    users.findOne.mockResolvedValue({
      id: 7,
      activo: true,
      nombre: 'Ana',
      apellido: 'Paz',
    });
    repo.create.mockImplementation((fila: unknown) => fila);
    repo.save.mockResolvedValue({ id: 42 });
  });

  const marcar = () =>
    request(app.getHttpServer())
      .post('/api/attendance/check')
      .field('tipo', 'entrada')
      .attach('foto', Buffer.from('foto-test'), {
        filename: 'foto.jpg',
        contentType: 'image/jpeg',
      });

  it('desconocido: no entrega identidad y no escribe asistencia', async () => {
    const res = await marcar().expect(201);
    expect(res.body).toMatchObject({
      reconocido: false,
      requiereConfirmacion: false,
      candidatos: [],
    });
    expect(res.body.candidato).toBeUndefined();
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('ambiguo por encima del umbral: no escribe asistencia', async () => {
    face.buscar.mockResolvedValue([
      { usuarioId: 7, similitud: 0.88 },
      { usuarioId: 8, similitud: 0.87 },
    ]);
    const res = await marcar().expect(201);
    expect(res.body.reconocido).toBe(false);
    expect(repo.save).not.toHaveBeenCalled();
  });
  it.each([0, 2])(
    'foto con %i rostros no compara la galería',
    async (rostros) => {
      face.analizarRostro.mockResolvedValue({
        ...analisis,
        rostros,
        rostroDetectado: rostros > 0,
      });
      const res = await marcar().expect(201);
      expect(res.body.reconocido).toBe(false);
      expect(face.buscar).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    },
  );
  it('detector fallido: 503 y ninguna inserción', async () => {
    face.analizarRostro.mockRejectedValue(
      new ServiceUnavailableException('SCRFD no disponible'),
    );
    await marcar().expect(503);
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('identidad clara: conserva marcaje automático', async () => {
    face.buscar.mockResolvedValue([{ usuarioId: 7, similitud: 0.95 }]);
    const res = await marcar().expect(201);
    expect(res.body).toMatchObject({
      reconocido: true,
      manual: false,
      candidato: { usuarioId: 7 },
    });
    expect(repo.save).toHaveBeenCalledTimes(1);
  });
});
