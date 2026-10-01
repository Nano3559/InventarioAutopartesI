import { memoryStorage } from 'multer';

/**
 * Configuración de `FileInterceptor` / `FilesInterceptor` para subidas de imagen.
 * Se comparte entre módulos (productos, registro facial) para no duplicar el filtro
 * ni los límites: el archivo se procesa en memoria y se sube a Supabase.
 */
export function multerImagenes(opts?: {
  maxFiles?: number;
  maxBytes?: number;
}) {
  return {
    storage: memoryStorage(),
    limits: {
      fileSize: opts?.maxBytes ?? 10 * 1024 * 1024,
      ...(opts?.maxFiles ? { files: opts.maxFiles } : {}),
    },
    fileFilter: imageFileFilter,
  };
}

export const imageFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!file.mimetype?.startsWith('image/')) {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  } else {
    cb(null, true);
  }
};
