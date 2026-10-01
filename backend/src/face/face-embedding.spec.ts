import {
  ARCFACE_DIMENSION,
  ARCFACE_ENTRADA,
  aNumero,
  aTensorNchw,
  esEmbeddingValido,
  normalizar,
  promediarYNormalizar,
  similitudCoseno,
} from './face-embedding';

/** Vector determinista de la dimensión de ArcFace. */
function vector(dim = ARCFACE_DIMENSION, semilla = 1): number[] {
  const out = new Array<number>(dim);
  let estado = semilla;
  for (let i = 0; i < dim; i++) {
    estado = (estado * 1664525 + 1013904223) % 4294967296;
    out[i] = estado / 4294967296 - 0.5;
  }
  return out;
}

const norma = (v: Float32Array | number[]) =>
  Math.sqrt(Array.from(v).reduce((a, x) => a + x * x, 0));

describe('face-embedding (Hito 3)', () => {
  describe('normalizar', () => {
    it('deja el vector con norma 1', () => {
      expect(norma(normalizar(vector()))).toBeCloseTo(1, 6);
    });

    it('no muta el vector de entrada', () => {
      const original = vector();
      const copia = [...original];
      normalizar(original);
      expect(original).toEqual(copia);
    });

    it('rechaza la norma 0 y los valores no numéricos', () => {
      expect(() => normalizar([0, 0, 0])).toThrow(/norma 0/);
      expect(() => normalizar([1, Number.NaN])).toThrow(/no numéricos/);
    });
  });

  describe('promediarYNormalizar', () => {
    it('promedia componente a componente y normaliza', () => {
      const a = [3, 4, 0, 0];
      const b = [3, 0, 4, 0];
      const salida = promediarYNormalizar([a, b]);
      // Promedio = [3, 2, 2, 0]; norma = sqrt(9 + 4 + 4) = sqrt(17).
      const esperado = Math.sqrt(17);
      expect(salida[0]).toBeCloseTo(3 / esperado, 6);
      expect(salida[1]).toBeCloseTo(2 / esperado, 6);
      expect(salida[2]).toBeCloseTo(2 / esperado, 6);
      expect(norma(salida)).toBeCloseTo(1, 6);
    });

    it('con un solo embedding devuelve ese vector normalizado', () => {
      const uno = vector();
      const consolidado = promediarYNormalizar([uno]);
      const referencia = normalizar(uno);
      expect(consolidado).toHaveLength(referencia.length);
      for (let i = 0; i < referencia.length; i++) {
        expect(consolidado[i]).toBeCloseTo(referencia[i], 6);
      }
    });

    it('el mismo rostro con fotos distintas queda más cerca que con otra persona', () => {
      const base = vector();
      const persona = vector(ARCFACE_DIMENSION, 99);
      // "Misma persona": el mismo vector con un poco de ruido.
      const conRuido = (semilla: number) =>
        base.map((x, i) => x + Math.sin(semilla + i) * 0.05);
      const consulta = normalizar(conRuido(3));
      const propios = promediarYNormalizar([
        conRuido(1),
        conRuido(2),
        consulta,
      ]);
      const ajeno = normalizar(persona);

      expect(similitudCoseno(propios, consulta)).toBeGreaterThan(
        similitudCoseno(ajeno, consulta),
      );
    });

    it('rechaza la lista vacía y dimensiones distintas', () => {
      expect(() => promediarYNormalizar([])).toThrow(/al menos un embedding/);
      expect(() =>
        promediarYNormalizar([
          [1, 2, 3],
          [1, 2],
        ]),
      ).toThrow(/dimensiones distintas/);
    });
  });

  describe('similitudCoseno', () => {
    it('da 1 consigo mismo y -1 con el opuesto', () => {
      const v = normalizar(vector());
      expect(similitudCoseno(v, v)).toBeCloseTo(1, 6);
      expect(
        similitudCoseno(
          v,
          v.map((x) => -x),
        ),
      ).toBeCloseTo(-1, 6);
    });

    it('es simétrica y no necesita vectores normalizados', () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];
      expect(similitudCoseno(a, b)).toBeCloseTo(similitudCoseno(b, a), 10);
    });

    it('rechaza dimensiones distintas', () => {
      expect(() => similitudCoseno([1, 2], [1, 2, 3])).toThrow(
        /dimensiones distintas/,
      );
    });
  });

  describe('esEmbeddingValido', () => {
    it('acepta un embedding de 512 números finitos', () => {
      expect(esEmbeddingValido(vector())).toBe(true);
    });

    it('rechaza null, otra dimensión, NaN y no-arreglos', () => {
      expect(esEmbeddingValido(null)).toBe(false);
      expect(esEmbeddingValido([1, 2, 3])).toBe(false);
      expect(
        esEmbeddingValido(vector(ARCFACE_DIMENSION, 5).fill(Number.NaN)),
      ).toBe(false);
      expect(esEmbeddingValido('[]')).toBe(false);
    });
  });

  describe('aNumero', () => {
    it('convierte a arreglo plano de números (jsonb)', () => {
      const salida = aNumero(normalizar([3, 4]));
      expect(Array.isArray(salida)).toBe(true);
      expect(salida).toHaveLength(2);
    });
  });

  describe('aTensorNchw', () => {
    const plano = ARCFACE_ENTRADA * ARCFACE_ENTRADA;

    it('arma [1,3,112,112] con los planos R, G y B en ese orden', () => {
      // (x - 127.5) / 128: el cero exacto es 127.5, así que un byte de 128 da
      // ~0.004. Se usa de relleno para que el resto del recorte sea uniforme.
      const pixeles = new Uint8Array(plano * 3).fill(128);
      pixeles[0] = 10;
      pixeles[1] = 64;
      pixeles[2] = 255;

      const tensor = aTensorNchw(pixeles);
      expect(tensor).toHaveLength(3 * plano);
      expect(tensor[0]).toBeCloseTo((10 - 127.5) / 128, 6);
      expect(tensor[plano]).toBeCloseTo((64 - 127.5) / 128, 6);
      expect(tensor[2 * plano]).toBeCloseTo((255 - 127.5) / 128, 6);
      // Los tres canales de un mismo píxel van en planos distintos, no intercalados:
      // el segundo píxel del plano R sale del buffer intacto.
      expect(tensor[1]).toBeCloseTo((128 - 127.5) / 128, 6);
    });

    it('rechaza un recorte de otro tamaño o de otros canales', () => {
      expect(() => aTensorNchw(new Uint8Array(10))).toThrow(/112x112 RGB/);
      expect(() => aTensorNchw(new Uint8Array(plano * 3), 1)).toThrow(
        /3 canales RGB/,
      );
    });
  });
});
