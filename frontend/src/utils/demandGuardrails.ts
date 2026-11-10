import type {
  GuardrailField,
  GuardrailIssue,
  GuardrailSuggestions,
  PredictSuccessDto,
} from '../types/demand.types';

export type ParqueSegment = 'Alto' | 'Medio' | 'Nicho';

export type WearType =
  | 'colision'
  | 'desgaste_medio'
  | 'desgaste_frecuente'
  | 'correctivo';

export type FinancialStatus =
  | 'invalid'
  | 'loss'
  | 'insufficient'
  | 'tight'
  | 'healthy'
  | 'overpriced';

export interface FinancialEvaluation {
  status: FinancialStatus;
  utilidadUnitaria: number;
  margenRelativo: number;
  margenPorcentaje: number;
  margenMayorRelativo: number | null;
  saludMargen: number;
  pvpMinimoRentable: number;
  pvpRecomendado: number;
  precioMayorSugerido: number;
  bloqueadoFinanciero: boolean;
  wholesaleConflict: boolean;
  wholesaleLoss: boolean;
  issues: GuardrailIssue[];
}

export interface GuardrailEvaluation {
  hasBlockers: boolean;
  hasSemanticBlockers: boolean;
  blockers: GuardrailIssue[];
  warnings: GuardrailIssue[];
  infos: GuardrailIssue[];
  allIssues: GuardrailIssue[];
  suggestions: GuardrailSuggestions;
  resolvedCategoria: string;
  resolvedWear: WearType;
  resolvedParque: ParqueSegment;
  taxonomyMatched: boolean;
  vehicleMatched: boolean;
  isExtendedCategory: boolean;
  financial: FinancialEvaluation;
}

interface CategoryRule {
  name: string;
  isBaseOnnx: boolean;
  defaultWear: WearType;
  compatibleWears: WearType[];
  keywords: string[];
}

interface VehicleModelRule {
  canonicalModel: string;
  brand: string;
  parque: ParqueSegment;
  aliases: string[];
}

export const ONNX_BASE_CATEGORY_OPTIONS = [
  'Carrocería',
  'Iluminación',
  'Refrigeración',
  'Cerrajería',
] as const;

export const EXTENDED_CATEGORY_OPTIONS = [
  'Frenos',
  'Filtros y Mantenimiento',
  'Suspensión y Dirección',
  'Motor y Transmisión',
  'Sistema Eléctrico',
] as const;

export const WEAR_OPTIONS: Array<{ value: WearType; label: string }> = [
  { value: 'colision', label: 'Colisión / Accidente' },
  { value: 'desgaste_medio', label: 'Desgaste Medio' },
  { value: 'desgaste_frecuente', label: 'Desgaste Frecuente' },
  { value: 'correctivo', label: 'Falla Correctiva' },
];

export const PARQUE_OPTIONS: Array<{ value: ParqueSegment; label: string }> = [
  { value: 'Alto', label: 'Alto (Hilux, Corolla, Yaris, NP300, Swift...)' },
  { value: 'Medio', label: 'Medio (Tucson, Sentra, Tiida, L200, CX-5...)' },
  { value: 'Nicho', label: 'Nicho (Duster, Ram, Cherokee, Durango, Europeo...)' },
];

export const WEAR_LABELS: Record<WearType, string> = {
  colision: 'Colisión / Accidente',
  desgaste_medio: 'Desgaste Medio',
  desgaste_frecuente: 'Desgaste Frecuente',
  correctivo: 'Falla Correctiva',
};

const ONNX_BASE_CATEGORIES = new Set<string>(ONNX_BASE_CATEGORY_OPTIONS);

const CATEGORY_RULES: CategoryRule[] = [
  {
    name: 'Iluminación',
    isBaseOnnx: true,
    defaultWear: 'desgaste_medio',
    compatibleWears: ['desgaste_medio', 'colision'],
    keywords: [
      'farol delantero',
      'farol trasero',
      'luz de freno',
      'foco led',
      'guinador',
      'guineador',
      'direccional',
      'intermitente',
      'neblinero',
      'halogeno',
      'farol',
      'faro',
      'stop',
      'optica',
      'foco',
      'silvin',
      'calavera',
      'mica',
    ],
  },
  {
    name: 'Refrigeración',
    isBaseOnnx: true,
    defaultWear: 'correctivo',
    compatibleWears: ['correctivo', 'desgaste_medio'],
    keywords: [
      'tanque de agua',
      'deposito de agua',
      'deposito refrigerante',
      'bomba de agua',
      'tapa de radiador',
      'tapa radiador',
      'manguera radiador',
      'electroventilador',
      'anticongelante',
      'refrigerante',
      'termostato',
      'condensador',
      'intercooler',
      'radiador',
      'ventilador',
      'panal',
      'tanque',
    ],
  },
  {
    name: 'Cerrajería',
    isBaseOnnx: true,
    defaultWear: 'desgaste_frecuente',
    compatibleWears: ['desgaste_frecuente', 'correctivo'],
    keywords: [
      'alza vidrio',
      'eleva vidrio',
      'bisagra puerta',
      'cilindro llave',
      'switch encendido',
      'chapa puerta',
      'manivela',
      'jalador',
      'cerradura',
      'alzavidrio',
      'elevavidrio',
      'picaporte',
      'actuador',
      'manija',
      'chapa',
      'llave',
    ],
  },
  {
    name: 'Carrocería',
    isBaseOnnx: true,
    defaultWear: 'colision',
    compatibleWears: ['colision'],
    keywords: [
      'espejo retrovisor',
      'parachoques delantero',
      'parachoques trasero',
      'tapa de motor',
      'parachoques',
      'paragolpes',
      'guardafango',
      'guardabarro',
      'tapabarro',
      'retrovisor',
      'compuerta',
      'parrilla',
      'mascara',
      'rejilla',
      'espejo',
      'puerta',
      'capot',
      'capo',
      'bumper',
      'aletin',
      'spoiler',
      'tolva',
    ],
  },
  {
    name: 'Frenos',
    isBaseOnnx: false,
    defaultWear: 'desgaste_frecuente',
    compatibleWears: ['desgaste_frecuente', 'desgaste_medio'],
    keywords: [
      'pastilla de freno',
      'disco de freno',
      'bomba de freno',
      'cilindro de freno',
      'liquido de freno',
      'pastilla',
      'pastillas',
      'balata',
      'balatas',
      'zapata',
      'zapatas',
      'caliper',
      'tambor',
      'freno',
    ],
  },
  {
    name: 'Filtros y Mantenimiento',
    isBaseOnnx: false,
    defaultWear: 'desgaste_frecuente',
    compatibleWears: ['desgaste_frecuente', 'desgaste_medio'],
    keywords: [
      'filtro de aceite',
      'filtro de aire',
      'filtro combustible',
      'filtro de cabina',
      'correa distribucion',
      'limpiaparabrisas',
      'filtro',
      'bujia',
      'bujias',
      'correa',
      'plumilla',
    ],
  },
  {
    name: 'Suspensión y Dirección',
    isBaseOnnx: false,
    defaultWear: 'desgaste_medio',
    compatibleWears: ['desgaste_medio', 'correctivo'],
    keywords: [
      'barra estabilizadora',
      'punta de eje',
      'caja direccion',
      'amortiguador',
      'cremallera',
      'rodamiento',
      'terminal',
      'bandeja',
      'espiral',
      'rotula',
      'munon',
      'buje',
      'axial',
      'muelle',
    ],
  },
  {
    name: 'Motor y Transmisión',
    isBaseOnnx: false,
    defaultWear: 'correctivo',
    compatibleWears: ['correctivo', 'desgaste_medio'],
    keywords: [
      'bomba de combustible',
      'bomba de gasolina',
      'bomba de aceite',
      'disco de embrague',
      'tanque de gasolina',
      'empaquetadura',
      'ciguenal',
      'embrague',
      'inyector',
      'empaque',
      'culata',
      'piston',
      'prensa',
      'valvula',
      'clutch',
      'turbo',
      'biela',
      'carter',
    ],
  },
  {
    name: 'Sistema Eléctrico',
    isBaseOnnx: false,
    defaultWear: 'correctivo',
    compatibleWears: ['correctivo', 'desgaste_medio'],
    keywords: [
      'motor de arranque',
      'cable de bujia',
      'alternador',
      'arranque',
      'bateria',
      'bobina',
      'sensor',
      'fusible',
      'relevador',
      'rele',
    ],
  },
];

const VEHICLE_MODEL_RULES: VehicleModelRule[] = [
  { canonicalModel: 'Hilux', brand: 'Toyota', parque: 'Alto', aliases: ['hilux'] },
  { canonicalModel: 'Corolla', brand: 'Toyota', parque: 'Alto', aliases: ['corolla'] },
  { canonicalModel: 'RAV4', brand: 'Toyota', parque: 'Alto', aliases: ['rav4', 'rav 4'] },
  { canonicalModel: 'Yaris', brand: 'Toyota', parque: 'Alto', aliases: ['yaris'] },
  { canonicalModel: 'Prado', brand: 'Toyota', parque: 'Alto', aliases: ['prado', 'land cruiser prado'] },
  { canonicalModel: 'Land Cruiser', brand: 'Toyota', parque: 'Alto', aliases: ['land cruiser'] },
  { canonicalModel: 'Hiace', brand: 'Toyota', parque: 'Alto', aliases: ['hiace'] },
  { canonicalModel: 'Fortuner', brand: 'Toyota', parque: 'Alto', aliases: ['fortuner'] },
  { canonicalModel: 'NP300', brand: 'Nissan', parque: 'Alto', aliases: ['np300', 'np 300'] },
  { canonicalModel: 'Frontier', brand: 'Nissan', parque: 'Alto', aliases: ['frontier', 'navara'] },
  { canonicalModel: 'Swift', brand: 'Suzuki', parque: 'Alto', aliases: ['swift'] },
  { canonicalModel: 'Vitara', brand: 'Suzuki', parque: 'Alto', aliases: ['grand vitara', 'vitara'] },
  { canonicalModel: 'Jimny', brand: 'Suzuki', parque: 'Alto', aliases: ['jimny'] },

  { canonicalModel: 'Sentra', brand: 'Nissan', parque: 'Medio', aliases: ['sentra'] },
  { canonicalModel: 'Tiida', brand: 'Nissan', parque: 'Medio', aliases: ['tiida'] },
  { canonicalModel: 'Versa', brand: 'Nissan', parque: 'Medio', aliases: ['versa'] },
  { canonicalModel: 'X-Trail', brand: 'Nissan', parque: 'Medio', aliases: ['x-trail', 'xtrail'] },
  { canonicalModel: 'Tucson', brand: 'Hyundai', parque: 'Medio', aliases: ['tucson'] },
  { canonicalModel: 'Accent', brand: 'Hyundai', parque: 'Medio', aliases: ['accent'] },
  { canonicalModel: 'Elantra', brand: 'Hyundai', parque: 'Medio', aliases: ['elantra'] },
  { canonicalModel: 'Santa Fe', brand: 'Hyundai', parque: 'Medio', aliases: ['santa fe'] },
  { canonicalModel: 'Sportage', brand: 'Kia', parque: 'Medio', aliases: ['sportage'] },
  { canonicalModel: 'Rio', brand: 'Kia', parque: 'Medio', aliases: ['rio'] },
  { canonicalModel: 'L200', brand: 'Mitsubishi', parque: 'Medio', aliases: ['l200', 'l-200', 'triton'] },
  { canonicalModel: 'Montero', brand: 'Mitsubishi', parque: 'Medio', aliases: ['montero', 'pajero'] },
  { canonicalModel: 'Mazda3', brand: 'Mazda', parque: 'Medio', aliases: ['mazda3', 'mazda 3'] },
  { canonicalModel: 'CX-5', brand: 'Mazda', parque: 'Medio', aliases: ['cx-5', 'cx5'] },
  { canonicalModel: 'Sail', brand: 'Chevrolet', parque: 'Medio', aliases: ['sail'] },
  { canonicalModel: 'Tracker', brand: 'Chevrolet', parque: 'Medio', aliases: ['tracker'] },
  { canonicalModel: 'D-Max', brand: 'Isuzu', parque: 'Medio', aliases: ['d-max', 'dmax'] },

  { canonicalModel: 'Duster', brand: 'Renault', parque: 'Nicho', aliases: ['duster'] },
  { canonicalModel: 'Logan', brand: 'Renault', parque: 'Nicho', aliases: ['logan'] },
  { canonicalModel: 'Sandero', brand: 'Renault', parque: 'Nicho', aliases: ['sandero'] },
  { canonicalModel: 'Grand Cherokee', brand: 'Jeep', parque: 'Nicho', aliases: ['grand cherokee'] },
  { canonicalModel: 'Cherokee', brand: 'Jeep', parque: 'Nicho', aliases: ['cherokee'] },
  { canonicalModel: 'Wrangler', brand: 'Jeep', parque: 'Nicho', aliases: ['wrangler'] },
  { canonicalModel: 'Compass', brand: 'Jeep', parque: 'Nicho', aliases: ['compass'] },
  { canonicalModel: 'Durango', brand: 'Dodge', parque: 'Nicho', aliases: ['durango'] },
  { canonicalModel: 'Ram 1500', brand: 'Dodge', parque: 'Nicho', aliases: ['ram 1500', 'ram'] },
  { canonicalModel: 'Journey', brand: 'Dodge', parque: 'Nicho', aliases: ['journey'] },
];

const KEYWORD_MATCHERS = CATEGORY_RULES.flatMap((rule) =>
  rule.keywords.map((kw) => ({ keyword: kw, rule })),
).sort((a, b) => b.keyword.length - a.keyword.length);

const MODEL_MATCHERS = VEHICLE_MODEL_RULES.flatMap((rule) =>
  rule.aliases.map((alias) => ({ alias, rule })),
).sort((a, b) => b.alias.length - a.alias.length);

export function normalizeText(value?: string): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMeaningfulText(value?: string): boolean {
  const clean = normalizeText(value);
  if (clean.length < 2) return false;
  if (!/[a-z]{2,}/.test(clean)) return false;
  if (/^(.)\1{3,}$/.test(clean.replace(/\s/g, ''))) return false;
  return true;
}

function hasKeywordWordBoundary(haystack: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|[^a-z0-9])${escaped}(s|es)?($|[^a-z0-9])`, 'i');
  return regex.test(haystack) || haystack.includes(keyword);
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function inferTaxonomyFromPart(producto: string) {
  const norm = normalizeText(producto);
  for (const matcher of KEYWORD_MATCHERS) {
    if (hasKeywordWordBoundary(norm, matcher.keyword)) {
      return {
        matched: true,
        matchedKeyword: matcher.keyword,
        categoria: matcher.rule.name,
        defaultWear: matcher.rule.defaultWear,
        compatibleWears: matcher.rule.compatibleWears,
        isExtendedCategory: !matcher.rule.isBaseOnnx,
      };
    }
  }
  return {
    matched: false,
    categoria: 'Carrocería',
    defaultWear: 'colision' as WearType,
    compatibleWears: ['colision', 'desgaste_medio', 'desgaste_frecuente', 'correctivo'] as WearType[],
    isExtendedCategory: false,
  };
}

export function inferVehicleKnowledge(marca?: string, modelo?: string) {
  const normModel = normalizeText(modelo);
  const normBrand = normalizeText(marca);

  for (const matcher of MODEL_MATCHERS) {
    if (normModel && hasKeywordWordBoundary(normModel, matcher.alias)) {
      const expectedBrandNorm = normalizeText(matcher.rule.brand);
      const brandConflict =
        normBrand.length >= 2 &&
        !normBrand.includes(expectedBrandNorm) &&
        !expectedBrandNorm.includes(normBrand) &&
        !(matcher.rule.brand === 'Dodge' && normBrand === 'ram');

      return {
        matchedRule: matcher.rule,
        brandConflict,
        expectedBrand: matcher.rule.brand,
        expectedParque: matcher.rule.parque,
      };
    }
  }

  if (
    ['peugeot', 'citroen', 'bmw', 'audi', 'mercedes', 'alfa romeo', 'porsche', 'land rover'].some(
      (b) => normBrand.includes(b),
    )
  ) {
    return {
      brandConflict: false,
      expectedParque: 'Nicho' as ParqueSegment,
    };
  }

  return { brandConflict: false };
}

export function evaluateFinancialHealth(
  rawCosto: number,
  rawPrecio1: number,
  rawPrecioMayor?: number,
): FinancialEvaluation {
  const costo = Number(rawCosto);
  const precio1 = Number(rawPrecio1);
  const hasPrecioMayor =
    rawPrecioMayor !== undefined &&
    rawPrecioMayor !== null &&
    String(rawPrecioMayor).trim() !== '' &&
    Number(rawPrecioMayor) > 0;
  const precioMayor = hasPrecioMayor ? Number(rawPrecioMayor) : undefined;

  const issues: GuardrailIssue[] = [];

  if (!Number.isFinite(costo) || costo <= 0) {
    issues.push({
      code: 'INVALID_COST',
      field: 'costo',
      severity: 'blocker',
      message: 'El costo unitario debe ser mayor a Bs. 0.',
      suggestion: 'Ingresa el costo real de compra por unidad.',
    });
  }

  if (!Number.isFinite(precio1) || precio1 <= 0) {
    issues.push({
      code: 'INVALID_PRICE',
      field: 'precio1',
      severity: 'blocker',
      message: 'El precio de venta en mostrador debe ser mayor a Bs. 0.',
      suggestion:
        Number.isFinite(costo) && costo > 0
          ? `Fijar PVP mínimo en Bs. ${roundMoney(costo * 1.15)} (ideal Bs. ${roundMoney(costo * 1.35)}).`
          : 'Ingresa un precio de venta válido.',
      suggestedField: Number.isFinite(costo) && costo > 0 ? 'precio1' : undefined,
      suggestedValue:
        Number.isFinite(costo) && costo > 0 ? roundMoney(costo * 1.35) : undefined,
    });
  }

  if (
    rawPrecioMayor !== undefined &&
    rawPrecioMayor !== null &&
    (!Number.isFinite(Number(rawPrecioMayor)) || Number(rawPrecioMayor) < 0)
  ) {
    issues.push({
      code: 'INVALID_WHOLESALE_PRICE',
      field: 'precioMayor',
      severity: 'blocker',
      message: 'El precio mayorista no puede ser negativo.',
    });
  }

  const safeCosto = Number.isFinite(costo) && costo > 0 ? costo : 1;
  const safePrecio1 = Number.isFinite(precio1) && precio1 > 0 ? precio1 : 0;
  const utilidadUnitaria = roundMoney(safePrecio1 - safeCosto);
  const margenRelativo = safePrecio1 > 0 ? (safePrecio1 - safeCosto) / safeCosto : -1;
  const margenPorcentaje = Math.round(margenRelativo * 1000) / 10;

  const pvpMinimoRentable = Math.ceil(safeCosto * 1.15 * 100) / 100;
  const pvpRecomendado = Math.ceil(safeCosto * 1.35 * 100) / 100;
  const precioMayorSugerido = Math.ceil(Math.max(safeCosto * 1.2, pvpRecomendado * 0.85) * 100) / 100;

  if (!Number.isFinite(costo) || costo <= 0 || !Number.isFinite(precio1) || precio1 <= 0) {
    return {
      status: 'invalid',
      utilidadUnitaria,
      margenRelativo,
      margenPorcentaje,
      margenMayorRelativo: null,
      saludMargen: 0,
      pvpMinimoRentable,
      pvpRecomendado,
      precioMayorSugerido,
      bloqueadoFinanciero: true,
      wholesaleConflict: false,
      wholesaleLoss: false,
      issues,
    };
  }

  let wholesaleConflict = false;
  let wholesaleLoss = false;
  let margenMayorRelativo: number | null = null;

  if (precioMayor !== undefined) {
    margenMayorRelativo = (precioMayor - safeCosto) / safeCosto;
    if (precioMayor > safePrecio1) {
      wholesaleConflict = true;
      issues.push({
        code: 'WHOLESALE_ABOVE_RETAIL',
        field: 'precioMayor',
        severity: 'blocker',
        message: `El precio mayorista (Bs. ${roundMoney(precioMayor)}) no puede superar al precio mostrador (Bs. ${roundMoney(safePrecio1)}).`,
        suggestion: `Ajustar mayorista a Bs. ${roundMoney(safePrecio1 * 0.85)}.`,
        suggestedField: 'precioMayor',
        suggestedValue: roundMoney(safePrecio1 * 0.85),
      });
    } else if (precioMayor <= safeCosto) {
      wholesaleLoss = true;
      const lossMayor = roundMoney(safeCosto - precioMayor);
      issues.push({
        code: 'WHOLESALE_LOSS',
        field: 'precioMayor',
        severity: 'warning',
        message:
          lossMayor > 0
            ? `Mayorista a pérdida: Bs. ${roundMoney(precioMayor)} está por debajo del costo (pierdes Bs. ${lossMayor}/ud.).`
            : 'Mayorista igual al costo (0% utilidad en ventas al por mayor).',
        suggestion: `Ajustar mayorista a Bs. ${precioMayorSugerido}.`,
        suggestedField: 'precioMayor',
        suggestedValue: precioMayorSugerido,
      });
    }
  }

  let status: FinancialStatus = 'healthy';
  let saludMargen = 85;
  let bloqueadoFinanciero = false;

  if (safePrecio1 <= safeCosto) {
    status = 'loss';
    saludMargen = 0;
    bloqueadoFinanciero = true;
    const perdida = roundMoney(safeCosto - safePrecio1);
    issues.push({
      code: safePrecio1 < safeCosto ? 'NEGATIVE_MARGIN' : 'ZERO_MARGIN',
      field: 'precio1',
      severity: 'warning',
      message:
        safePrecio1 < safeCosto
          ? `VENTA A PÉRDIDA: pierdes Bs. ${perdida} por cada unidad vendida (Costo Bs. ${roundMoney(safeCosto)} > PVP Bs. ${roundMoney(safePrecio1)}).`
          : 'MARGEN NULO (0%): el precio iguala al costo y no cubre fletes ni gastos operativos.',
      suggestion: `PVP mínimo rentable (15%): Bs. ${pvpMinimoRentable} · Recomendado (35%): Bs. ${pvpRecomendado}.`,
      suggestedField: 'precio1',
      suggestedValue: pvpRecomendado,
    });
  } else if (margenRelativo < 0.15) {
    status = 'insufficient';
    saludMargen = Math.round((margenRelativo / 0.15) * 28);
    issues.push({
      code: 'INSUFFICIENT_MARGIN',
      field: 'precio1',
      severity: 'warning',
      message: `Margen insuficiente (${margenPorcentaje}%). Menos del 15% apenas cubre fletes e impuestos.`,
      suggestion: `Subir PVP mínimo a Bs. ${pvpMinimoRentable} (+15%) o ideal Bs. ${pvpRecomendado} (+35%).`,
      suggestedField: 'precio1',
      suggestedValue: pvpRecomendado,
    });
  } else if (margenRelativo < 0.25) {
    status = 'tight';
    saludMargen = Math.round(35 + ((margenRelativo - 0.15) / 0.1) * 30);
    issues.push({
      code: 'TIGHT_MARGIN',
      field: 'precio1',
      severity: 'info',
      message: `Margen ajustado (${margenPorcentaje}%). Poco espacio para descuentos por volumen.`,
    });
  } else if (margenRelativo <= 1.2) {
    status = 'healthy';
    saludMargen = Math.round(72 + Math.min(28, ((margenRelativo - 0.25) / 0.45) * 28));
  } else if (margenRelativo <= 1.5) {
    status = 'healthy';
    saludMargen = Math.round(100 - ((margenRelativo - 1.2) / 0.3) * 18);
  } else {
    status = 'overpriced';
    saludMargen = Math.max(20, Math.round(82 - (margenRelativo - 1.5) * 25));
    issues.push({
      code: 'EXTREME_MARKUP',
      field: 'precio1',
      severity: 'warning',
      message: `Sobreprecio extremo (${margenPorcentaje}% sobre costo): alto riesgo de estancamiento frente a la competencia.`,
      suggestion: `Fijar un precio más competitivo cercano a Bs. ${pvpRecomendado}.`,
      suggestedField: 'precio1',
      suggestedValue: pvpRecomendado,
    });
  }

  if (wholesaleLoss && saludMargen > 0) {
    saludMargen = Math.max(10, saludMargen - 15);
  }

  return {
    status,
    utilidadUnitaria,
    margenRelativo,
    margenPorcentaje,
    margenMayorRelativo,
    saludMargen,
    pvpMinimoRentable,
    pvpRecomendado,
    precioMayorSugerido,
    bloqueadoFinanciero,
    wholesaleConflict,
    wholesaleLoss,
    issues,
  };
}

export function evaluateDemandGuardrails(input: PredictSuccessDto): GuardrailEvaluation {
  const issues: GuardrailIssue[] = [];
  const suggestions: GuardrailSuggestions = {};

  const producto = (input.producto ?? '').trim();
  const marca = (input.marca ?? '').trim();
  const modelo = (input.modelo ?? '').trim();

  if (producto.length > 0 && !isMeaningfulText(producto)) {
    issues.push({
      code: 'INVALID_PRODUCT_NAME',
      field: 'producto',
      severity: 'blocker',
      message: 'El nombre del repuesto no parece válido (usa al menos 2 letras reales).',
    });
  }

  if (marca.length > 0 && !isMeaningfulText(marca)) {
    issues.push({
      code: 'INVALID_BRAND',
      field: 'marca',
      severity: 'blocker',
      message: 'La marca del vehículo no parece válida.',
    });
  }

  if (modelo.length > 0 && !isMeaningfulText(modelo)) {
    issues.push({
      code: 'INVALID_MODEL',
      field: 'modelo',
      severity: 'blocker',
      message: 'El modelo del vehículo no parece válido.',
    });
  }

  const taxonomy = inferTaxonomyFromPart(producto);
  const vehicle = inferVehicleKnowledge(marca, modelo);

  const selectedCatRaw = (input.categoriaRepuesto ?? '').trim();
  const selectedWearRaw = (input.tipoDesgaste ?? '').trim() as WearType | '';
  const selectedParqueRaw = (input.segmentoParque ?? '').trim() as ParqueSegment | '';

  const resolvedCategoria = selectedCatRaw || taxonomy.categoria;
  const matchedSelectedRule = CATEGORY_RULES.find(
    (r) => normalizeText(r.name) === normalizeText(resolvedCategoria),
  );

  // 1. Coherencia Producto <-> Categoría
  if (isMeaningfulText(producto) && taxonomy.matched) {
    if (normalizeText(resolvedCategoria) !== normalizeText(taxonomy.categoria)) {
      suggestions.categoriaRepuesto = taxonomy.categoria;
      issues.push({
        code: 'CATEGORY_MISMATCH',
        field: 'categoriaRepuesto',
        severity: 'blocker',
        message: `Incongruencia: "${producto}" pertenece a "${taxonomy.categoria}", no a "${resolvedCategoria}".`,
        suggestion: `Cambiar a ${taxonomy.categoria}`,
        suggestedField: 'categoriaRepuesto',
        suggestedValue: taxonomy.categoria,
      });
    }
  } else if (isMeaningfulText(producto) && !taxonomy.matched) {
    issues.push({
      code: 'UNRECOGNIZED_PART_KEYWORD',
      field: 'producto',
      severity: 'info',
      message: `"${producto}" no coincide con una palabra clave estándar; verifica que "${resolvedCategoria}" y el desgaste sean correctos.`,
    });
  }

  // 2. Coherencia Categoría/Producto <-> Desgaste
  const effectiveRule = taxonomy.matched
    ? CATEGORY_RULES.find((r) => r.name === taxonomy.categoria)
    : matchedSelectedRule;
  const resolvedWear: WearType =
    selectedWearRaw && selectedWearRaw in WEAR_LABELS
      ? selectedWearRaw
      : (effectiveRule?.defaultWear ?? taxonomy.defaultWear);

  if (effectiveRule && selectedWearRaw) {
    if (!effectiveRule.compatibleWears.includes(resolvedWear)) {
      const targetWear = effectiveRule.defaultWear;
      suggestions.tipoDesgaste = targetWear;
      issues.push({
        code: 'WEAR_INCOMPATIBLE',
        field: 'tipoDesgaste',
        severity: 'blocker',
        message: `Desgaste incompatible: un repuesto de "${effectiveRule.name}" no corresponde a "${WEAR_LABELS[resolvedWear]}".`,
        suggestion: `Usar ${WEAR_LABELS[targetWear]}`,
        suggestedField: 'tipoDesgaste',
        suggestedValue: targetWear,
      });
    } else if (resolvedWear !== effectiveRule.defaultWear) {
      issues.push({
        code: 'WEAR_ALTERNATIVE',
        field: 'tipoDesgaste',
        severity: 'info',
        message: `Para "${effectiveRule.name}", lo más habitual es "${WEAR_LABELS[effectiveRule.defaultWear]}" (actual: "${WEAR_LABELS[resolvedWear]}").`,
      });
    }
  }

  // 3. Marca <-> Modelo y Parque Vehicular
  if (vehicle.brandConflict && vehicle.expectedBrand) {
    suggestions.marca = vehicle.expectedBrand;
    issues.push({
      code: 'BRAND_MODEL_MISMATCH',
      field: 'marca',
      severity: 'blocker',
      message: `El modelo "${modelo}" pertenece a "${vehicle.expectedBrand}", no a "${marca}".`,
      suggestion: `Corregir marca a ${vehicle.expectedBrand}`,
      suggestedField: 'marca',
      suggestedValue: vehicle.expectedBrand,
    });
  }

  const resolvedParque: ParqueSegment =
    selectedParqueRaw === 'Alto' || selectedParqueRaw === 'Medio' || selectedParqueRaw === 'Nicho'
      ? selectedParqueRaw
      : (vehicle.expectedParque ?? 'Medio');

  if (vehicle.expectedParque && selectedParqueRaw && selectedParqueRaw !== vehicle.expectedParque) {
    const isExtremeJump =
      (vehicle.expectedParque === 'Alto' && selectedParqueRaw === 'Nicho') ||
      (vehicle.expectedParque === 'Nicho' && selectedParqueRaw === 'Alto');

    suggestions.segmentoParque = vehicle.expectedParque;
    issues.push({
      code: isExtremeJump ? 'PARQUE_EXTREME_MISMATCH' : 'PARQUE_MISMATCH',
      field: 'segmentoParque',
      severity: isExtremeJump ? 'blocker' : 'warning',
      message: `Para "${vehicle.matchedRule?.canonicalModel ?? marca}" en Bolivia el parque vehicular real es "${vehicle.expectedParque}", no "${selectedParqueRaw}".`,
      suggestion: `Cambiar parque a ${vehicle.expectedParque}`,
      suggestedField: 'segmentoParque',
      suggestedValue: vehicle.expectedParque,
    });
  }

  const isExtendedCategory =
    !ONNX_BASE_CATEGORIES.has(resolvedCategoria) || taxonomy.isExtendedCategory;
  if (isExtendedCategory && !suggestions.categoriaRepuesto) {
    issues.push({
      code: 'EXTENDED_CATEGORY_INFO',
      field: 'categoriaRepuesto',
      severity: 'info',
      message: `"${resolvedCategoria}" es una línea automotriz extendida; se priorizará desgaste, parque vehicular y rentabilidad financiera.`,
    });
  }

  const financial = evaluateFinancialHealth(
    Number(input.costo),
    Number(input.precio1),
    input.precioMayor,
  );
  for (const finIssue of financial.issues) {
    issues.push(finIssue);
    if (finIssue.suggestedField === 'precio1' && typeof finIssue.suggestedValue === 'number') {
      suggestions.precio1 = finIssue.suggestedValue;
    }
    if (finIssue.suggestedField === 'precioMayor' && typeof finIssue.suggestedValue === 'number') {
      suggestions.precioMayor = finIssue.suggestedValue;
    }
  }

  const blockers = issues.filter((i) => i.severity === 'blocker');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  const semanticCodes = new Set([
    'INVALID_PRODUCT_NAME',
    'INVALID_BRAND',
    'INVALID_MODEL',
    'CATEGORY_MISMATCH',
    'WEAR_INCOMPATIBLE',
    'BRAND_MODEL_MISMATCH',
    'PARQUE_EXTREME_MISMATCH',
    'WHOLESALE_ABOVE_RETAIL',
  ]);

  return {
    hasBlockers: blockers.length > 0,
    hasSemanticBlockers: blockers.some((b) => semanticCodes.has(b.code)),
    blockers,
    warnings,
    infos,
    allIssues: issues,
    suggestions,
    resolvedCategoria,
    resolvedWear,
    resolvedParque,
    taxonomyMatched: taxonomy.matched,
    vehicleMatched: Boolean(vehicle.matchedRule || vehicle.expectedParque),
    isExtendedCategory,
    financial,
  };
}

export function issuesForField(
  evaluation: GuardrailEvaluation,
  field: GuardrailField,
): GuardrailIssue[] {
  return evaluation.allIssues.filter((issue) => issue.field === field);
}
