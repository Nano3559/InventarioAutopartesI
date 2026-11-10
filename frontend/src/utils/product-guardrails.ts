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

export const TIPOS_DESGASTE_OPCIONES = [
  { value: 'colision', label: 'Colisión / Accidente' },
  { value: 'desgaste_medio', label: 'Desgaste Medio' },
  { value: 'desgaste_frecuente', label: 'Desgaste Frecuente' },
  { value: 'correctivo', label: 'Falla Correctiva' },
  { value: 'preventivo', label: 'Mantenimiento Preventivo' },
] as const;

export const SEGMENTOS_PARQUE = ['Alto', 'Medio', 'Nicho'] as const;

export const CATEGORIAS_ENTRENADAS = [
  'Iluminación',
  'Refrigeración',
  'Cerrajería',
  'Carrocería',
] as const;

export const DESGASTES_ENTRENADOS = [
  'colision',
  'desgaste_medio',
  'desgaste_frecuente',
  'correctivo',
] as const;

interface ReglaCategoria {
  categoria: string;
  palabras: string[];
  desgastes: string[];
}

const REGLAS_CATEGORIA: ReglaCategoria[] = [
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
  'yaris',
  'hilux',
  'corolla',
  'np300',
  'frontier',
  'rav4',
  'prado',
  'land cruiser',
];
const MODELOS_PARQUE_MEDIO = [
  'montero',
  'mazda3',
  'sentra',
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
  return String(valor ?? '')
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

export function inferirCategoria(producto: string): string | null {
  const texto = normalizarTexto(producto);
  if (!texto) return null;

  let mejor: { categoria: string; coincidencias: number } | null = null;
  for (const regla of REGLAS_CATEGORIA) {
    const coincidencias = regla.palabras.filter((palabra) =>
      coincidePalabra(texto, palabra),
    ).length;
    if (coincidencias > 0 && (!mejor || coincidencias > mejor.coincidencias)) {
      mejor = { categoria: regla.categoria, coincidencias };
    }
  }
  return mejor?.categoria ?? null;
}

export function inferirTipoDesgaste(categoria: string | null): string | null {
  if (!categoria) return null;
  const regla = REGLAS_CATEGORIA.find((r) => r.categoria === categoria);
  return regla?.desgastes[0] ?? null;
}

export function inferirSegmentoParque(
  modelo: string | null | undefined,
): string | null {
  const texto = normalizarTexto(modelo);
  if (!texto) return null;
  if (MODELOS_PARQUE_ALTO.some((m) => coincidePalabra(texto, m))) return 'Alto';
  if (MODELOS_PARQUE_MEDIO.some((m) => coincidePalabra(texto, m)))
    return 'Medio';
  if (MODELOS_PARQUE_NICHO.some((m) => coincidePalabra(texto, m)))
    return 'Nicho';
  return null;
}

export interface BorradorInput {
  producto: string;
  modelo?: string;
  categoriaRepuesto?: string;
  tipoDesgaste?: string;
  costo: number;
  precio1: number;
  precioMayor?: number;
}

export interface AnalisisBorrador {
  categoriaSugerida: string | null;
  tipoDesgasteSugerido: string | null;
  segmentoSugerido: string | null;
  categoriaIncoherente: boolean;
  tipoDesgasteIncoherente: boolean;
  margenPorcentaje: number | null;
  margenEstado: 'sin-datos' | 'inviable' | 'critico' | 'saludable';
  pvpMinimoSugerido: number | null;
  pvpRecomendado: number | null;
  errores: string[];
  erroresSemanticos: string[];
  erroresFinancieros: string[];
  advertencias: string[];
}

function redondear(valor: number, decimales = 2): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

export function analizarBorrador(input: BorradorInput): AnalisisBorrador {
  const errores: string[] = [];
  const advertencias: string[] = [];
  const categoriaSugerida = inferirCategoria(input.producto);
  const segmentoSugerido = inferirSegmentoParque(input.modelo);

  let categoriaIncoherente = false;
  if (
    categoriaSugerida &&
    input.categoriaRepuesto &&
    input.categoriaRepuesto !== 'General' &&
    input.categoriaRepuesto !== categoriaSugerida
  ) {
    categoriaIncoherente = true;
    errores.push(
      `La categoría seleccionada no corresponde al repuesto. Se sugiere «${categoriaSugerida}».`,
    );
  }

  const categoriaEfectiva = categoriaSugerida ?? input.categoriaRepuesto;
  const regla = REGLAS_CATEGORIA.find((r) => r.categoria === categoriaEfectiva);
  const tipoDesgasteSugerido = regla?.desgastes[0] ?? null;
  let tipoDesgasteIncoherente = false;
  if (
    regla &&
    input.tipoDesgaste &&
    !regla.desgastes.includes(input.tipoDesgaste)
  ) {
    tipoDesgasteIncoherente = true;
    errores.push(
      `El tipo de desgaste no corresponde al repuesto: «${input.tipoDesgaste}» no es típico de «${categoriaEfectiva}». Se sugiere «${tipoDesgasteSugerido}».`,
    );
  }

  if (
    categoriaEfectiva &&
    !CATEGORIAS_ENTRENADAS.some((c) => c === categoriaEfectiva)
  ) {
    advertencias.push(
      `La categoría «${categoriaEfectiva}» no fue parte del entrenamiento del modelo; la rotación estimada será menos precisa.`,
    );
  }
  if (
    input.tipoDesgaste &&
    !DESGASTES_ENTRENADOS.some((d) => d === input.tipoDesgaste)
  ) {
    advertencias.push(
      `El tipo de desgaste «${input.tipoDesgaste}» no fue parte del entrenamiento del modelo.`,
    );
  }

  const erroresSemanticos = [...errores];
  const costo = Number(input.costo);
  const precio1 = Number(input.precio1);
  const costoValido = Number.isFinite(costo) && costo > 0;
  const precioValido = Number.isFinite(precio1) && precio1 > 0;

  if (!costoValido) errores.push('El costo debe ser mayor a cero.');
  if (!precioValido) errores.push('El precio de mostrador debe ser mayor a cero.');
  if (input.precioMayor !== undefined &&
      (!Number.isFinite(input.precioMayor) || input.precioMayor <= 0)) {
    errores.push('El precio mayorista debe ser mayor a cero o dejarse vacío.');
  }

  let margenPorcentaje: number | null = null;
  let margenEstado: AnalisisBorrador['margenEstado'] = 'sin-datos';
  let pvpMinimoSugerido: number | null = null;
  let pvpRecomendado: number | null = null;

  if (costoValido) {
    pvpMinimoSugerido = redondear(costo * 1.15);
    pvpRecomendado = redondear(costo * 1.35);
  }

  if (costoValido && precioValido) {
    const margen = (precio1 - costo) / costo;
    margenPorcentaje = redondear(margen * 100);
    if (precio1 <= costo) {
      margenEstado = 'inviable';
      errores.push(
        'El precio de mostrador debe ser mayor al costo unitario.',
      );
    } else if (margen < 0.15) {
      margenEstado = 'critico';
      advertencias.push(
        `Margen insuficiente (${margenPorcentaje.toFixed(1)}%). PVP mínimo sugerido: Bs. ${pvpMinimoSugerido?.toFixed(2)}.`,
      );
    } else {
      margenEstado = 'saludable';
    }

    if (
      input.precioMayor !== undefined &&
      input.precioMayor !== null &&
      input.precioMayor > 0
    ) {
      if (input.precioMayor > precio1) {
        errores.push(
          'El precio mayorista no puede superar al precio de mostrador.',
        );
      } else if (input.precioMayor <= costo) {
        errores.push(
          'El precio mayorista debe ser mayor al costo unitario.',
        );
      } else if (input.precioMayor / precio1 < 0.7) {
        advertencias.push(
          'El precio mayorista es muy bajo respecto al de mostrador y puede canibalizar el margen.',
        );
      }
    }
  }

  return {
    categoriaSugerida,
    tipoDesgasteSugerido,
    segmentoSugerido,
    categoriaIncoherente,
    tipoDesgasteIncoherente,
    margenPorcentaje,
    margenEstado,
    pvpMinimoSugerido,
    pvpRecomendado,
    errores,
    erroresSemanticos,
    erroresFinancieros: errores.slice(erroresSemanticos.length),
    advertencias,
  };
}
