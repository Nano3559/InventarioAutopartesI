import bwipjs from '@bwip-js/node';

/** Simbología usada en las etiquetas: Code128 (1D, alfanumérico). */
export const CODIGO_BARRAS_SIMBOLOGIA = 'code128';

/**
 * Construye la identidad interna del producto: `AP-<id>-<codigoFabrica>`.
 * - El `id` garantiza unicidad aunque dos productos del mismo fabricante coincidan.
 * - El código de fábrica se normaliza a mayúsculas y sin espacios para que el
 *   texto sea válido en Code128 (ASCII imprimible).
 */
export function buildCodigoBarras(
  id: number,
  codigoFabrica?: string | null,
): string {
  const base = `AP-${String(id).padStart(4, '0')}`;
  const fabrica = (codigoFabrica ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return fabrica ? `${base}-${fabrica}` : base;
}

/**
 * Renderiza la etiqueta como PNG: **solo barras**, sin texto legible
 * (`includetext: false`). `paddingwidth: 10` deja la zona de silencio que
 * necesita el lector para no confundirse con el borde de la etiqueta.
 */
export function renderCodigoBarrasPng(codigo: string): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: CODIGO_BARRAS_SIMBOLOGIA,
    text: codigo,
    scale: 3,
    height: 12,
    includetext: false,
    paddingwidth: 10,
    paddingheight: 2,
    barcolor: '000000',
    backgroundcolor: 'FFFFFF',
  });
}
