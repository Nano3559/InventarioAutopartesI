import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validateSync } from 'class-validator';
import sharp from 'sharp';
import {
  PartClassDto,
  PartHealthDto,
  PartModelInfoDto,
  PartRecognitionResultDto,
} from './part-recognition.dto';

export const PART_IMAGE_LIMIT = 10 * 1024 * 1024;
const MIME_FORMATS: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class PartRecognitionService {
  private readonly url: string;
  private readonly key: string;
  private readonly timeout: number;
  private readonly capacity: number;
  readonly maxBytes: number;
  private readonly maxPixels: number;
  private active = 0;

  constructor(config: ConfigService) {
    const url = new URL(
      config.get<string>('AUTOPARTS_AI_URL', 'http://127.0.0.1:8001'),
    );
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error(
        'AUTOPARTS_AI_URL debe ser una URL HTTP interna sin credenciales, query ni fragmento',
      );
    }
    this.url = url.toString().replace(/\/$/, '');
    this.key = config.get<string>('AUTOPARTS_AI_API_KEY', '');
    this.timeout = this.integer(
      config,
      'AUTOPARTS_AI_TIMEOUT_MS',
      30000,
      120000,
    );
    this.capacity = this.integer(config, 'AUTOPARTS_AI_MAX_CONCURRENT', 2, 8);
    this.maxBytes = this.integer(
      config,
      'AUTOPARTS_AI_MAX_IMAGE_BYTES',
      PART_IMAGE_LIMIT,
      PART_IMAGE_LIMIT,
    );
    this.maxPixels = this.integer(
      config,
      'AUTOPARTS_AI_MAX_IMAGE_PIXELS',
      20000000,
      40000000,
    );
  }

  private integer(
    config: ConfigService,
    key: string,
    fallback: number,
    maximum: number,
  ): number {
    const value = Number(config.get<string>(key, String(fallback)));
    if (!Number.isInteger(value) || value < 1 || value > maximum) {
      throw new Error(`${key} debe ser un entero entre 1 y ${maximum}`);
    }
    return value;
  }

  async predict(
    file: Express.Multer.File | undefined,
  ): Promise<PartRecognitionResultDto> {
    if (!file?.buffer?.length)
      throw new BadRequestException('Selecciona una imagen en el campo file');
    if (file.buffer.length > this.maxBytes)
      throw new PayloadTooLargeException(
        'La imagen supera el tamaño permitido',
      );
    if (!MIME_FORMATS[file.mimetype])
      throw new BadRequestException(
        'Solo se permiten imágenes JPG, PNG y WebP',
      );
    if (this.active >= this.capacity)
      throw new HttpException(
        'El reconocimiento está ocupado. Intenta nuevamente.',
        429,
      );
    this.active++;
    try {
      try {
        const image = sharp(file.buffer, {
          limitInputPixels: this.maxPixels,
          failOn: 'warning',
        }).timeout({ seconds: 5 });
        const metadata = await image.metadata();
        if (
          metadata.format !== MIME_FORMATS[file.mimetype] ||
          (metadata.pages ?? 1) > 1
        ) {
          throw new Error('Formato real incompatible o imagen animada');
        }
        // Decode every pixel to reject truncated files; the original image is forwarded unchanged.
        await image.stats();
      } catch {
        throw new BadRequestException(
          'La imagen no es válida, está dañada, es animada o supera el límite de píxeles',
        );
      }
      const body = new FormData();
      body.append(
        'file',
        new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
        'autoparte',
      );
      return this.dto(
        PartRecognitionResultDto,
        await this.request('/predict', { method: 'POST', body }),
      );
    } finally {
      this.active--;
    }
  }

  async health(): Promise<PartHealthDto> {
    return this.dto(PartHealthDto, await this.request('/health'));
  }

  async modelInfo(): Promise<PartModelInfoDto> {
    return this.dto(PartModelInfoDto, await this.request('/model/info'));
  }

  async classes(): Promise<PartClassDto[]> {
    const payload = await this.request('/classes');
    if (!Array.isArray(payload) || payload.length > 1000)
      throw new BadGatewayException(
        'Respuesta inválida del servicio de reconocimiento',
      );
    return payload.map((entry: unknown) => this.dto(PartClassDto, entry));
  }

  private dto<T extends object>(
    type: ClassConstructor<T>,
    payload: unknown,
  ): T {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadGatewayException(
        'Respuesta inválida del servicio de reconocimiento',
      );
    }
    const result = plainToInstance(type, payload);
    if (
      validateSync(result, {
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
      }).length
    ) {
      throw new BadGatewayException(
        'Respuesta inválida del servicio de reconocimiento',
      );
    }
    return result;
  }

  private async request(
    path: string,
    options: RequestInit = {},
  ): Promise<unknown> {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), this.timeout);
    try {
      const response = await fetch(`${this.url}${path}`, {
        ...options,
        signal: abort.signal,
        redirect: 'error',
        headers: this.key ? { 'X-API-Key': this.key } : {},
      });
      if (!response.ok) {
        await response.body?.cancel();
        const errors: Record<number, { code: string; message: string }> = {
          400: {
            code: 'invalid_image',
            message: 'La imagen no pudo ser analizada',
          },
          413: {
            code: 'image_too_large',
            message: 'La imagen supera el tamaño permitido',
          },
          429: {
            code: 'service_busy',
            message: 'El reconocimiento está ocupado. Intenta nuevamente.',
          },
          503: {
            code: 'model_unavailable',
            message: 'El modelo de reconocimiento todavía no está disponible',
          },
          504: {
            code: 'inference_timeout',
            message: 'El análisis tardó demasiado. Intenta nuevamente.',
          },
        };
        if (errors[response.status])
          throw new HttpException(errors[response.status], response.status);
        throw new BadGatewayException({
          code: 'upstream_error',
          message:
            'El servicio de reconocimiento no pudo completar la solicitud',
        });
      }
      // Bound response streaming, including responses without Content-Length.
      const reader = response.body?.getReader();
      if (!reader)
        throw new BadGatewayException(
          'Respuesta vacía del servicio de reconocimiento',
        );
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2 * 1024 * 1024) {
          await reader.cancel();
          throw new BadGatewayException(
            'Respuesta demasiado grande del servicio de reconocimiento',
          );
        }
        chunks.push(value);
      }
      try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
      } catch {
        throw new BadGatewayException(
          'Respuesta inválida del servicio de reconocimiento',
        );
      }
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      if (abort.signal.aborted)
        throw new GatewayTimeoutException({
          code: 'inference_timeout',
          message: 'El análisis tardó demasiado. Intenta nuevamente.',
        });
      throw new ServiceUnavailableException({
        code: 'service_unavailable',
        message: 'El servicio de reconocimiento no está disponible',
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
