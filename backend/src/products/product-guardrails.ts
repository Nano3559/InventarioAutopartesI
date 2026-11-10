export const CATEGORIAS_REPUESTO = [
  'Carrocería',
  'Iluminación',
  'Refrigeración',
  'Cerrajería',
  'Frenos',
  'Suspensión',
  'Motor',
  'Transmisión',
  'Dirección',
  'Eléctrico',
  'Filtros',
  'Escape',
  'Accesorios',
  'General',
] as const;

export type CategoriaRepuesto = (typeof CATEGORIAS_REPUESTO)[number];

export const TIPOS_DESGASTE = [
  'colision',
  'desgaste_medio',
  'desgaste_frecuente',
  'correctivo',
  'preventivo',
] as const;

export type TipoDesgaste = (typeof TIPOS_DESGASTE)[number];

export const SEGMENTOS_PARQUE = ['Alto', 'Medio', 'Nicho'] as const;

export const LIMITE_PRECIO_RAZONABLE = 1_000_000;

const PALABRAS_NO_AUTOMOTRICES = [
  'pizza',
  'hamburguesa',
  'manzana',
  'banana',
  'perro',
  'celular',
  'telefono',
  'computadora',
  'laptop',
  'mesa',
  'zapato',
  'camisa',
  'pantalon',
  'comida',
  'bebida',
  'cerveza',
  'helado',
  'juguete',
  'pelota',
  'bicicleta',
  'libro',
  'lapiz',
  'televisor',
  'television',
  'audifonos',
  'asdf',
  'qwerty',
  'zxcv',
  'lorem',
  'ipsum',
  'prueba',
  'test',
  'basura',
] as const;

export type SegmentoParque = (typeof SEGMENTOS_PARQUE)[number];

interface ReglaCategoria {
  categoria: CategoriaRepuesto;
  palabras: readonly string[];
  desgastes: readonly TipoDesgaste[];
}

const REGLAS_CATEGORIA: readonly ReglaCategoria[] = [
  {
    categoria: 'Iluminación',
    palabras: [
      'farol',
      'foco',
      'stop',
      'guinador',
      'guino',
      'intermitente',
      'neblinero',
      'luz',
      'luces',
      'led',
      'xenon',
      'ampolleta',
      'lampara',
      'reflector',
      'direccional',
    ],
    desgastes: ['desgaste_medio', 'colision', 'correctivo'],
  },
  {
    categoria: 'Refrigeración',
    palabras: [
      'radiador',
      'tanque de agua',
      'condensador',
      'termostato',
      'bomba de agua',
      'electroventilador',
      'ventilador',
      'manguera',
      'calefaccion',
      'evaporador',
      'compresor',
      'refrigerante',
      'enfriador',
    ],
    desgastes: ['correctivo', 'desgaste_medio', 'preventivo'],
  },
  {
    categoria: 'Cerrajería',
    palabras: [
      'cerradura',
      'chapa',
      'manija',
      'manivela',
      'jalador',
      'llave',
      'cilindro',
      'bisagra',
      'seguro de puerta',
      'pestillo',
    ],
    desgastes: ['desgaste_frecuente', 'desgaste_medio', 'correctivo'],
  },
  {
    categoria: 'Frenos',
    palabras: [
      'pastilla',
      'disco de freno',
      'disco',
      'tambor',
      'caliper',
      'mordaza',
      'liquido de frenos',
      'zapata',
      'cilindro de freno',
      'bomba de freno',
      'freno',
      'abs',
    ],
    desgastes: ['desgaste_frecuente', 'desgaste_medio', 'correctivo'],
  },
  {
    categoria: 'Suspensión',
    palabras: [
      'amortiguador',
      'resorte',
      'espiral',
      'buje',
      'rotula',
      'barra estabilizadora',
      'muelle',
      'suspension',
      'brazo de suspension',
      'terminal',
    ],
    desgastes: ['desgaste_frecuente', 'desgaste_medio', 'correctivo'],
  },
  {
    categoria: 'Dirección',
    palabras: [
      'cremallera',
      'caja de direccion',
      'bomba hidraulica',
      'volante',
      'columna',
      'terminal de direccion',
      'direccion',
    ],
    desgastes: ['desgaste_frecuente', 'desgaste_medio', 'correctivo'],
  },
  {
    categoria: 'Transmisión',
    palabras: [
      'caja de cambios',
      'embrague',
      'clutch',
      'disco de embrague',
      'palanca',
      'cardan',
      'diferencial',
      'semieje',
      'transmision',
      'sincronizado',
      'caja',
    ],
    desgastes: ['desgaste_frecuente', 'desgaste_medio', 'correctivo'],
  },
  {
    categoria: 'Eléctrico',
    palabras: [
      'alternador',
      'arranque',
      'marcha',
      'bateria',
      'sensor',
      'modulo',
      'fusible',
      'rele',
      'cable',
      'bobina',
      'distribuidor',
      'motor de arranque',
    ],
    desgastes: ['correctivo', 'desgaste_medio', 'preventivo'],
  },
  {
    categoria: 'Motor',
    palabras: [
      'piston',
      'biela',
      'ciguenal',
      'culata',
      'junta',
      'empaque',
      'valvula',
      'arbol de levas',
      'bomba de aceite',
      'correa',
      'cadena',
      'bujia',
      'inyector',
      'carburador',
      'turbo',
      'multiple',
      'motor',
    ],
    desgastes: ['correctivo', 'desgaste_medio', 'preventivo'],
  },
  {
    categoria: 'Filtros',
    palabras: [
      'filtro de aire',
      'filtro de combustible',
      'filtro de aceite',
      'filtro de habitaculo',
      'filtro',
    ],
    desgastes: ['preventivo', 'desgaste_medio'],
  },
  {
    categoria: 'Escape',
    palabras: [
      'silenciador',
      'catalizador',
      'tubo de escape',
      'multiple de escape',
      'escape',
    ],
    desgastes: ['correctivo', 'desgaste_medio'],
  },
  {
    categoria: 'Carrocería',
    palabras: [
      'parachoques',
      'bumper',
      'capo',
      'capot',
      'puerta',
      'guardafango',
      'faldon',
      'espejo',
      'techo',
      'parabrisas',
      'vidrio',
      'maletero',
      'mascara',
      'rejilla',
      'spoiler',
      'aleron',
      'panel',
      'carroceria',
    ],
    desgastes: ['colision', 'correctivo'],
  },
  {
    categoria: 'Accesorios',
    palabras: [
      'tapiceria',
      'alfombra',
      'cubre',
      'emblema',
      'moldura',
      'portaequipajes',
      'accesorio',
      'funda',
    ],
    desgastes: ['desgaste_medio', 'colision'],
  },
];

const MODELOS_PARQUE_ALTO = [
  'hilux',
  'corolla',
  'yaris',
  'np300',
  'frontier',
  'rav4',
  'prado',
  'land cruiser',
  'hilux surf',
];
const MODELOS_PARQUE_MEDIO = [
  'sentra',
  'montero',
  'mazda3',
  'tiida',
  'tucson',
  'accent',
  'l200',
  'santa fe',
  'cx5',
  'cx-5',
  'ranger',
  'amarok',
];
const MODELOS_PARQUE_NICHO = [
  'duster',
  'ram',
  'logan',
  'sandero',
  'koleos',
  'captur',
  'tiguan',
  'territory',
  'qashqai',
];

export function normalizarTexto(valor: unknown): string {
  const texto =
    typeof valor === 'string'
      ? valor
      : typeof valor === 'number'
        ? String(valor)
        : '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function coincidePalabra(textoNormalizado: string, palabra: string): boolean {
  const palabraNormalizada = normalizarTexto(palabra);
  if (!palabraNormalizada) return false;
  const patron = new RegExp(
    `(^|[^a-z0-9])${escaparRegex(palabraNormalizada)}(?:s|es)?([^a-z0-9]|$)`,
  );
  return patron.test(textoNormalizado);
}

export interface InferenciaCategoria {
  categoria: CategoriaRepuesto;
  coincidencias: string[];
}

export function inferirCategoria(producto: string): InferenciaCategoria | null {
  const texto = normalizarTexto(producto);
  if (!texto) return null;

  let mejor: InferenciaCategoria | null = null;
  for (const regla of REGLAS_CATEGORIA) {
    const coincidencias = regla.palabras.filter((palabra) =>
      coincidePalabra(texto, palabra),
    );
    if (
      coincidencias.length > 0 &&
      (!mejor || coincidencias.length > mejor.coincidencias.length)
    ) {
      mejor = { categoria: regla.categoria, coincidencias };
    }
  }
  return mejor;
}

export function inferirTipoDesgaste(
  categoria: CategoriaRepuesto,
): TipoDesgaste | null {
  const regla = REGLAS_CATEGORIA.find((r) => r.categoria === categoria);
  return regla?.desgastes[0] ?? null;
}

export function inferirSegmentoParque(
  modelo: string | null | undefined,
): SegmentoParque | null {
  const texto = normalizarTexto(modelo);
  if (!texto) return null;
  if (MODELOS_PARQUE_ALTO.some((m) => coincidePalabra(texto, m))) return 'Alto';
  if (MODELOS_PARQUE_MEDIO.some((m) => coincidePalabra(texto, m)))
    return 'Medio';
  if (MODELOS_PARQUE_NICHO.some((m) => coincidePalabra(texto, m)))
    return 'Nicho';
  return null;
}

function canonizarCategoria(
  valor: string | null | undefined,
): CategoriaRepuesto | null {
  const texto = normalizarTexto(valor);
  if (!texto) return null;
  return CATEGORIAS_REPUESTO.find((c) => normalizarTexto(c) === texto) ?? null;
}

function canonizarTipoDesgaste(
  valor: string | null | undefined,
): TipoDesgaste | null {
  const texto = normalizarTexto(valor).replace(/[\s-]+/g, '_');
  const alias: Record<string, TipoDesgaste> = {
    colision: 'colision',
    accidente: 'colision',
    desgaste_medio: 'desgaste_medio',
    desgaste_frecuente: 'desgaste_frecuente',
    correctivo: 'correctivo',
    falla_correctiva: 'correctivo',
    preventivo: 'preventivo',
  };
  return TIPOS_DESGASTE.find((t) => t === texto) ?? alias[texto] ?? null;
}

export interface SemanticInput {
  producto: string;
  marca?: string | null;
  modelo?: string | null;
  categoriaRepuesto?: string | null;
  tipoDesgaste?: string | null;
  segmentoParque?: string | null;
}

export interface SemanticValidation {
  categoriaDeclarada: string | null;
  categoriaInferida: CategoriaRepuesto | null;
  categoriaUsada: CategoriaRepuesto;
  tipoDesgasteDeclarado: TipoDesgaste | null;
  tipoDesgasteSugerido: TipoDesgaste | null;
  tipoDesgasteUsado: TipoDesgaste;
  segmentoUsado: SegmentoParque;
  productoNoAutomotriz: boolean;
  coherente: boolean;
  advertencias: string[];
  correccionSugerida: string | null;
}

/** Los primeros registros recibieron esta tupla por defecto, sin clasificación real. */
export function normalizarMetadataCatalogo(
  input: SemanticInput,
): SemanticInput {
  const legacy =
    input.categoriaRepuesto === 'General' &&
    input.tipoDesgaste === 'preventivo' &&
    input.segmentoParque === 'Medio';
  const categoria =
    legacy || !input.categoriaRepuesto
      ? (inferirCategoria(input.producto)?.categoria ?? 'General')
      : input.categoriaRepuesto;
  return {
    ...input,
    categoriaRepuesto: categoria,
    tipoDesgaste:
      legacy || !input.tipoDesgaste
        ? (inferirTipoDesgaste(categoria as CategoriaRepuesto) ?? 'preventivo')
        : input.tipoDesgaste,
    segmentoParque:
      legacy || !input.segmentoParque
        ? (inferirSegmentoParque(input.modelo) ?? 'Nicho')
        : input.segmentoParque,
  };
}

export function validarSemantica(input: SemanticInput): SemanticValidation {
  const advertencias: string[] = [];
  const producto = input.producto.trim();
  const textoNoAutomotriz = normalizarTexto(
    `${producto} ${input.marca ?? ''} ${input.modelo ?? ''}`,
  );
  const palabraNoAutomotriz =
    PALABRAS_NO_AUTOMOTRICES.find((palabra) =>
      coincidePalabra(textoNoAutomotriz, palabra),
    ) ?? null;
  const productoNoAutomotriz = palabraNoAutomotriz !== null;
  if (productoNoAutomotriz) {
    advertencias.push(
      `Datos incoherentes: «${producto}» no parece una autoparte. Vuelva a introducir los datos del repuesto.`,
    );
  }
  const declaradaCanonica = canonizarCategoria(input.categoriaRepuesto);
  const inferencia = inferirCategoria(producto);
  const categoriaInferida = inferencia?.categoria ?? null;
  const categoriaUsada: CategoriaRepuesto =
    categoriaInferida ?? declaradaCanonica ?? 'General';

  const correccionSugerida: string | null = categoriaInferida;

  if (input.categoriaRepuesto?.trim()) {
    if (!declaradaCanonica) {
      advertencias.push(
        `La categoría «${input.categoriaRepuesto.trim()}» no está en el catálogo. Seleccione una categoría válida.`,
      );
    } else if (
      categoriaInferida &&
      declaradaCanonica !== 'General' &&
      declaradaCanonica !== categoriaInferida
    ) {
      advertencias.push(
        `Categoría incoherente: «${producto}» normalmente pertenece a «${categoriaInferida}», no a «${declaradaCanonica}». Revise la categoría antes de realizar el análisis.`,
      );
    }
  }

  const regla = REGLAS_CATEGORIA.find((r) => r.categoria === categoriaUsada);
  const tipoDesgasteSugerido = regla?.desgastes[0] ?? null;
  const tipoDesgasteDeclarado = canonizarTipoDesgaste(input.tipoDesgaste);
  let tipoDesgasteUsado: TipoDesgaste;

  if (tipoDesgasteDeclarado) {
    if (regla && !regla.desgastes.includes(tipoDesgasteDeclarado)) {
      tipoDesgasteUsado = tipoDesgasteSugerido ?? tipoDesgasteDeclarado;
      advertencias.push(
        `Tipo de desgaste incoherente: «${tipoDesgasteDeclarado}» no es típico de «${categoriaUsada}». Revise el tipo de desgaste antes de realizar el análisis.`,
      );
    } else {
      tipoDesgasteUsado = tipoDesgasteDeclarado;
    }
  } else {
    tipoDesgasteUsado = tipoDesgasteSugerido ?? 'preventivo';
    if (input.tipoDesgaste?.trim()) {
      advertencias.push(
        `El tipo de desgaste «${input.tipoDesgaste.trim()}» no es válido. Seleccione un tipo válido.`,
      );
    }
  }

  const segmentoDeclarado = SEGMENTOS_PARQUE.find(
    (s) => normalizarTexto(s) === normalizarTexto(input.segmentoParque),
  );
  let segmentoUsado: SegmentoParque;
  if (segmentoDeclarado) {
    segmentoUsado = segmentoDeclarado;
  } else {
    segmentoUsado = inferirSegmentoParque(input.modelo) ?? 'Nicho';
    if (input.segmentoParque?.trim()) {
      advertencias.push(
        `El segmento de parque «${input.segmentoParque.trim()}» no es válido. Seleccione un segmento válido.`,
      );
    }
  }

  return {
    categoriaDeclarada: input.categoriaRepuesto?.trim() || null,
    categoriaInferida,
    categoriaUsada,
    tipoDesgasteDeclarado,
    tipoDesgasteSugerido,
    tipoDesgasteUsado,
    segmentoUsado,
    productoNoAutomotriz,
    coherente: advertencias.length === 0,
    advertencias,
    correccionSugerida,
  };
}

export interface FinancialInput {
  costo: number;
  precio1: number;
  precioMayor?: number | null;
}

export interface FinancialValidation {
  margenRelativo: number;
  margenPorcentaje: number;
  margenSalud: number;
  bloqueado: boolean;
  errores: string[];
  advertencias: string[];
  pvpMinimoSugerido: number;
  pvpRecomendado: number;
  ratioMayorista: number | null;
}

function redondear(valor: number, decimales = 2): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

export function calcularSaludMargen(margenRelativo: number): number {
  if (!Number.isFinite(margenRelativo) || margenRelativo <= 0) return 0;
  if (margenRelativo >= 0.4) return 100;
  if (margenRelativo >= 0.3) return 85 + ((margenRelativo - 0.3) / 0.1) * 15;
  if (margenRelativo >= 0.2) return 65 + ((margenRelativo - 0.2) / 0.1) * 20;
  if (margenRelativo >= 0.15) return 50 + ((margenRelativo - 0.15) / 0.05) * 15;
  return (margenRelativo / 0.15) * 50;
}

export function validarFinanzas(input: FinancialInput): FinancialValidation {
  const errores: string[] = [];
  const advertencias: string[] = [];
  const costo = Number(input.costo);
  const precio1 = Number(input.precio1);
  const costoValido = Number.isFinite(costo) && costo > 0;
  const precio1Valido = Number.isFinite(precio1) && precio1 > 0;

  if (!costoValido) {
    errores.push('El costo debe ser un número mayor a 0.');
  }
  if (!precio1Valido) {
    errores.push('El precio de mostrador debe ser un número mayor a 0.');
  }

  let margenRelativo = 0;
  let margenPorcentaje = 0;
  let margenSalud = 0;

  if (costoValido && precio1Valido) {
    margenRelativo = (precio1 - costo) / costo;
    margenPorcentaje = redondear(margenRelativo * 100);
    margenSalud = calcularSaludMargen(margenRelativo);

    if (precio1 <= costo) {
      errores.push(
        `INVIABLE: el precio de venta (Bs. ${precio1.toFixed(2)}) es menor o igual al costo (Bs. ${costo.toFixed(2)}); se pierden Bs. ${(costo - precio1).toFixed(2)} por unidad.`,
      );
    } else if (margenRelativo < 0.15) {
      advertencias.push(
        `Margen insuficiente (${margenPorcentaje.toFixed(1)}%). Se recomienda al menos 15% para cubrir logística y costos fijos.`,
      );
    } else if (margenRelativo > 5) {
      advertencias.push(
        `Margen atípicamente alto (${margenPorcentaje.toFixed(1)}%). Verifica el costo o el precio antes de comprar el lote.`,
      );
    }
  }

  const pvpMinimoSugerido = costoValido ? redondear(costo * 1.15) : 0;
  const pvpRecomendado = costoValido ? redondear(costo * 1.35) : 0;

  let ratioMayorista: number | null = null;
  if (input.precioMayor !== undefined && input.precioMayor !== null) {
    const mayorista = Number(input.precioMayor);
    if (!Number.isFinite(mayorista) || mayorista <= 0) {
      errores.push('El precio mayorista debe ser un número mayor a 0.');
    } else {
      if (precio1Valido) {
        ratioMayorista = redondear(mayorista / precio1, 2);
        if (mayorista > precio1) {
          errores.push(
            `El precio mayorista (Bs. ${mayorista.toFixed(2)}) no puede superar al precio de mostrador (Bs. ${precio1.toFixed(2)}).`,
          );
        } else if (ratioMayorista < 0.7) {
          advertencias.push(
            `El precio mayorista es ${redondear(ratioMayorista * 100)}% del de mostrador; puede canibalizar el margen.`,
          );
        }
      }
      if (costoValido && mayorista <= costo) {
        errores.push(
          `INVIABLE: el precio mayorista (Bs. ${mayorista.toFixed(2)}) es menor o igual al costo; se pierden Bs. ${(costo - mayorista).toFixed(2)} por unidad.`,
        );
      }
    }
  }

  return {
    margenRelativo: redondear(margenRelativo, 4),
    margenPorcentaje,
    margenSalud: redondear(margenSalud, 1),
    bloqueado: errores.length > 0,
    errores,
    advertencias,
    pvpMinimoSugerido,
    pvpRecomendado,
    ratioMayorista,
  };
}

export interface ScoreInput {
  scoreRotacion: number;
  saludMargen: number;
  saturacionCatalogo: number;
}

export interface ScoreResult {
  score: number;
  scoreSaturacion: number;
}

export function calcularScorePonderado(input: ScoreInput): ScoreResult {
  const rotacion = Math.min(100, Math.max(0, input.scoreRotacion));
  const margen = Math.min(100, Math.max(0, input.saludMargen));
  const saturacion = Math.max(0, input.saturacionCatalogo);
  const scoreSaturacion = Math.max(0, 100 - saturacion * 20);
  const score = rotacion * 0.4 + margen * 0.4 + scoreSaturacion * 0.2;

  return {
    score: Math.round(score * 10) / 10,
    scoreSaturacion,
  };
}
