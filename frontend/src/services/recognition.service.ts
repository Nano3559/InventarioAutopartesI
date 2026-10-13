import { API_BASE_URL, ApiError } from '../api/client';
import type { RecognitionResult } from '../types/recognition.types';

export const recognitionService = {
  async predict(file: File, signal: AbortSignal): Promise<RecognitionResult> {
    const form = new FormData();
    form.append('file', file);
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE_URL}/part-recognition/predict`, {
      method: 'POST', body: form, signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch((cause: unknown) => {
      if (signal.aborted) throw cause;
      throw new ApiError(0, 'No se pudo conectar con el servicio. Comprueba tu conexión e intenta nuevamente.');
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.assign('/login');
      }
      const messages: Record<number, string> = {
        502: 'El servicio de reconocimiento no pudo completar la solicitud. Intenta nuevamente más tarde.',
        504: 'El análisis tardó demasiado. Intenta nuevamente.',
        429: 'El servicio está ocupado. Espera unos segundos e intenta nuevamente.',
        413: 'La imagen supera el tamaño permitido de 10 MB.',
      };
      const message = data?.message;
      if (response.status === 503) {
        const modelUnavailable = data?.code === 'model_unavailable' || (typeof message === 'string' && message.includes('modelo'));
        throw new ApiError(503, modelUnavailable ? 'El modelo todavía no está disponible. Intenta nuevamente más tarde.' : 'El servicio de reconocimiento está desconectado. Intenta nuevamente más tarde.', data);
      }
      throw new ApiError(response.status, messages[response.status] || (Array.isArray(message) ? message.join(', ') : message) || 'No se pudo analizar la imagen.', data);
    }
    return data as RecognitionResult;
  },
};
