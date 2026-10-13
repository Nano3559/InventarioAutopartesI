import { Repository } from 'typeorm';
import { AttendanceService } from './attendance.service';
import { FaceService, type AnalisisRostro } from '../face/face.service';
import { Asistencia } from '../entities/asistencia.entity';
import { User } from '../entities/user.entity';
import { Location } from '../entities/location.entity';

describe('AttendanceService: rechazo de falsos positivos', () => {
  const foto = { buffer: Buffer.from('foto') } as Express.Multer.File;
  const analisis: AnalisisRostro = {
    embedding: [1],
    deteccionDisponible: true,
    rostroDetectado: true,
    score: 0.99,
    rostros: 1,
    estrategia: 'alineado',
  };
  const asistencia = { create: jest.fn(), save: jest.fn() };
  const usuarios = { findOne: jest.fn() };
  const face = { analizarRostro: jest.fn(), buscar: jest.fn() };
  let servicio: AttendanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    face.analizarRostro.mockResolvedValue(analisis);
    face.buscar.mockResolvedValue([{ usuarioId: 7, similitud: 0.95 }]);
    servicio = new AttendanceService(
      asistencia as unknown as Repository<Asistencia>,
      usuarios as unknown as Repository<User>,
      {} as Repository<Location>,
      face as unknown as FaceService,
    );
  });

  it('detector ausente no puede aceptar una comparación alta', async () => {
    face.analizarRostro.mockResolvedValue({
      ...analisis,
      deteccionDisponible: false,
    });
    await expect(servicio.check(foto)).rejects.toMatchObject({ status: 503 });
    expect(face.buscar).not.toHaveBeenCalled();
    expect(asistencia.save).not.toHaveBeenCalled();
  });

  it.each([
    { ...analisis, rostroDetectado: false, rostros: 0 },
    { ...analisis, rostros: 2 },
    { ...analisis, estrategia: 'completo' },
  ])('rechaza escenas sin rostro único alineado: %j', async (escena) => {
    face.analizarRostro.mockResolvedValue(escena);
    expect(await servicio.check(foto)).toMatchObject({
      reconocido: false,
      candidatos: [],
    });
    expect(face.buscar).not.toHaveBeenCalled();
    expect(asistencia.save).not.toHaveBeenCalled();
  });

  it.each([
    { candidatos: [{ usuarioId: 7, similitud: 0.3 }] },
    {
      candidatos: [
        { usuarioId: 7, similitud: 0.85 },
        { usuarioId: 8, similitud: 0.84 },
      ],
    },
    { candidatos: [] },
  ])(
    'un desconocido o una identidad ambigua no genera asistencia: %j',
    async ({ candidatos }) => {
      face.buscar.mockResolvedValue(candidatos);
      expect(await servicio.check(foto)).toMatchObject({
        reconocido: false,
        candidatos: [],
      });
      expect(asistencia.save).not.toHaveBeenCalled();
      expect(usuarios.findOne).not.toHaveBeenCalled();
    },
  );

  it('una identidad clara mantiene el marcaje automático', async () => {
    usuarios.findOne.mockResolvedValue({
      id: 7,
      nombre: 'Ana',
      apellido: 'Paz',
    });
    asistencia.create.mockImplementation((fila: unknown) => fila);
    asistencia.save.mockResolvedValue({ id: 42 });
    jest.spyOn(servicio, 'findOne').mockResolvedValue({ id: 42 } as never);
    expect(await servicio.check(foto, 'entrada')).toMatchObject({
      reconocido: true,
      manual: false,
    });
    expect(asistencia.create).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 7, metodo: 'automatico' }),
    );
    expect(asistencia.save).toHaveBeenCalledTimes(1);
  });
});
