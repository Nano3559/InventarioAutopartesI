import { ApiError, appendFile, requestForm } from './client';
import type { RecognitionImage, RecognitionResult } from '../types/recognition';

const ERROR_MESSAGES: Partial<Record<number, string>> = {
  400: 'La imagen no es válida o su formato no es compatible. Prueba con otra fotografía.',
  401: 'Tu sesión expiró. Cierra sesión e ingresa nuevamente.',
  403: 'Esta cuenta no tiene permiso para usar el reconocimiento inteligente.',
  413: 'La imagen supera el límite permitido de 10 MB.',
  429: 'El servicio está ocupado. Espera unos segundos e intenta nuevamente.',
  502: 'El servicio de reconocimiento no pudo completar el análisis. Intenta más tarde.',
  504: 'El análisis tardó demasiado. Intenta nuevamente.',
};

export async function predictPart(
  image: RecognitionImage,
  token?: string | null,
): Promise<RecognitionResult> {
  const form = new FormData();
  appendFile(form, 'file', image);

  try {
    // El proxy Nest puede esperar hasta 120 s por el modelo. Dejamos un margen
    // para que llegue su respuesta de timeout en lugar de cortar antes en el móvil.
    return await requestForm<RecognitionResult>(
      '/part-recognition/predict',
      form,
      token,
      125_000,
    );
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.status === 503) {
      const unavailable =
        error.extras.code === 'model_unavailable' ||
        error.message.toLowerCase().includes('modelo');
      throw new ApiError(
        unavailable
          ? 'El modelo todavía no está disponible. Intenta nuevamente más tarde.'
          : 'El servicio de reconocimiento está desconectado. Intenta nuevamente más tarde.',
        error.status,
        error.extras,
      );
    }
    const friendly = ERROR_MESSAGES[error.status];
    if (friendly) throw new ApiError(friendly, error.status, error.extras);
    throw error;
  }
}
