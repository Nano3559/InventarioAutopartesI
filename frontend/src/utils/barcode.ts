/**
 * Construye la identidad interna del producto: `AP-<id>-<codigoFabrica>`.
 * Mismo formato y algoritmo que el backend `src/common/barcode.ts`.
 */
export function buildFallbackCodigo(id: number, codigoFabrica?: string | null): string {
  const base = `AP-${String(id).padStart(4, '0')}`;
  const fabrica = (codigoFabrica ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return fabrica ? `${base}-${fabrica}` : base;
}
