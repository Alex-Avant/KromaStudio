import type {
  HalftoneApplicationMode,
  HalftoneColorMode,
  HalftoneDotShape,
  HalftonePolarity,
  HalftoneUnderbaseStyle,
} from '../types/halftone';

export interface NumericParameterDefinition {
  readonly id: string;
  readonly label: string;
  readonly defaultValue: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit: string;
  readonly displayScale: number;
  readonly description: string;
  readonly effect: string;
}

export interface BooleanParameterDefinition {
  readonly id: string;
  readonly label: string;
  readonly defaultValue: boolean;
  readonly min: false;
  readonly max: true;
  readonly unit: 'boolean';
  readonly description: string;
  readonly effect: string;
}

function numeric(
  id: string,
  label: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  unit: string,
  description: string,
  effect: string,
  displayScale = 1,
): NumericParameterDefinition {
  return { id, label, defaultValue, min, max, step, unit, displayScale, description, effect };
}

/** Fuente única de límites y metadatos de los parámetros numéricos del motor. */
export const HALFTONE_PARAMETER_REGISTRY = {
  lpi: numeric('screen.lpi', 'Frecuencia', 35, 15, 60, 1, 'LPI', 'Líneas por pulgada de la trama.', 'Determina DPI/LPI y la frecuencia física.'),
  angle: numeric('screen.angle', 'Ángulo', 22.5, 0, 180, 0.5, '°', 'Orientación de la rejilla AM.', 'Rota la coordenada de muestreo del patrón.'),
  brightness: numeric('tone.brightness', 'Brillo', 0, -100, 100, 1, '%', 'Desplazamiento tonal antes de la trama.', 'Suma un offset a la luminancia.'),
  contrast: numeric('tone.contrast', 'Contraste', 0, -100, 100, 1, '%', 'Contraste alrededor del tono medio.', 'Escala la luminancia alrededor de 0.5.'),
  gamma: numeric('tone.gamma', 'Gamma', 1, 0.4, 2.5, 0.05, '×', 'Compensación no lineal de los tonos.', 'Aplica una potencia a la cobertura.'),
  minDot: numeric('screen.min-dot', 'Punto mínimo', 0.08, 0.01, 0.2, 0.005, '%', 'Cobertura mínima que sostiene un punto.', 'Funde puntos pequeños con una transición suave.', 100),
  maxDot: numeric('screen.max-dot', 'Punto máximo', 1, 0.8, 1, 0.01, '%', 'Límite superior de cobertura de un punto.', 'Limita la cobertura sin fusionar las celdas.', 100),
  solidThreshold: numeric('screen.solid-threshold', 'Umbral de sólidos', 0.98, 0.8, 1, 0.01, '%', 'Cobertura desde la que puede preservarse tinta sólida.', 'Fades Only lo usa de base; solidEnabled lo extiende a otros modos.', 100),
  dpi: numeric('output.dpi', 'DPI de salida', 300, 72, 600, 1, 'DPI', 'Resolución física solicitada para exportar.', 'Determina el número de píxeles por pulgada.'),
  blackPoint: numeric('tone.black-point', 'Punto negro', 0, 0, 255, 1, 'nivel', 'Nivel de luminancia asignado al negro tonal.', 'Se remapea a 0 antes de generar cobertura.'),
  whitePoint: numeric('tone.white-point', 'Punto blanco', 255, 0, 255, 1, 'nivel', 'Nivel de luminancia asignado al blanco tonal.', 'Se remapea a 1 antes de generar cobertura.'),
  choke: numeric('underbase.choke', 'Choke', 1, 0, 3, 0.5, 'px', 'Erosión de la máscara de base blanca.', 'Reduce la base en los bordes.'),
  spread: numeric('underbase.spread', 'Spread', 0, 0, 3, 0.5, 'px', 'Expansión de la máscara de base blanca.', 'Amplía la base alrededor de la tinta.'),
} as const satisfies Record<string, NumericParameterDefinition>;

export type NumericParameterId = keyof typeof HALFTONE_PARAMETER_REGISTRY;

function boolean(
  id: string,
  label: string,
  defaultValue: boolean,
  description: string,
  effect: string,
): BooleanParameterDefinition {
  return { id, label, defaultValue, min: false, max: true, unit: 'boolean', description, effect };
}

export const BOOLEAN_PARAMETER_REGISTRY = {
  edgeSmooth: boolean('screen.edge-smoothing', 'Suavizado de bordes', true, 'Antialias de la frontera de cada punto.', 'Activa el ancho de transición calculado con derivadas WGSL.'),
  edgeProtect: boolean('screen.edge-protection', 'Protección de bordes', true, 'Evita el fallback de cobertura media en imágenes pequeñas.', 'Mantiene la geometría local en lugar de promediar celdas irresolubles.'),
  solidEnabled: boolean('screen.solid-threshold-enabled', 'Umbral de sólidos', false, 'Extiende la conservación de sólidos a Full y Knockout.', 'Fades Only preserva sólidos con su comportamiento propio.'),
  underbase: boolean('underbase.enabled', 'Base blanca', true, 'Genera una placa de blanco.', 'Activa la pasada de underbase.'),
  showUnderbase: boolean('underbase.preview', 'Mostrar base blanca', true, 'Superpone la base blanca en la vista de resultado.', 'Afecta solo a la previsualización.'),
  keepAspect: boolean('output.keep-aspect', 'Mantener proporción', true, 'Vincula ancho y alto físicos.', 'Actualiza una dimensión cuando se edita la otra.'),
  mirror: boolean('output.mirror', 'Espejo horizontal', false, 'Invierte horizontalmente las placas de salida.', 'El flag se aplica en el shader de exportación, no en el preview.'),
} as const;

export const ENUM_PARAMETER_REGISTRY = {
  applicationMode: {
    id: 'screen.application-mode', label: 'Aplicación de la trama', unit: 'mode', defaultValue: 'fades' as HalftoneApplicationMode,
    values: ['fades', 'knockout', 'full'] as const,
    description: 'Modo de aplicación de la trama.', effect: 'Cambia cobertura y máscara alfa en WGSL.',
  },
  dotShape: {
    id: 'screen.dot-shape', label: 'Forma del punto', unit: 'shape', defaultValue: 'circle' as HalftoneDotShape,
    values: ['circle', 'ellipse', 'diamond', 'square', 'line'] as const,
    description: 'Forma disponible del spot function.', effect: 'Elige una de las cinco áreas de celda implementadas.',
  },
  polarity: {
    id: 'tone.polarity', label: 'Polaridad', unit: 'mode', defaultValue: 'light' as HalftonePolarity,
    values: ['light', 'dark'] as const,
    description: 'Extremo tonal que genera tinta o knockout.', effect: 'Invierte la cobertura antes del screen.',
  },
  colorMode: {
    id: 'output.color-mode', label: 'Modo de color', unit: 'mode', defaultValue: 'color' as HalftoneColorMode,
    values: ['color', 'mono'] as const,
    description: 'Color original o tinta monocroma.', effect: 'Cambia el RGB sin alterar la cobertura.',
  },
  underbaseStyle: {
    id: 'underbase.style', label: 'Estilo de base', unit: 'mode', defaultValue: 'dot' as HalftoneUnderbaseStyle,
    values: ['dot', 'solid'] as const,
    description: 'Geometría de la base blanca.', effect: 'Usa máscara tramada o sólida bajo la tinta visible.',
  },
  outputUnit: {
    id: 'output.unit', label: 'Unidad física', unit: 'unit', defaultValue: 'in' as const,
    values: ['in', 'cm'] as const,
    description: 'Unidad de dimensiones físicas de salida.', effect: 'Cambia la unidad de presentación y entrada.',
  },
} as const;

export const EXPORT_PARAMETER_REGISTRY = {
  physicalWidthIn: numeric('output.width', 'Ancho físico', 0, 0, 1000, 0.01, 'in', 'Ancho solicitado; cero usa el ancho de fuente a DPI de salida.', 'Se remuestrea a ancho físico por DPI.'),
  physicalHeightIn: numeric('output.height', 'Alto físico', 0, 0, 1000, 0.01, 'in', 'Alto solicitado; cero usa el alto de fuente a DPI de salida.', 'Se remuestrea a alto físico por DPI.'),
} as const satisfies Record<string, NumericParameterDefinition>;

export function validateNumericParameter(id: NumericParameterId, value: number): number {
  const definition = HALFTONE_PARAMETER_REGISTRY[id];
  if (!Number.isFinite(value)) return definition.defaultValue;
  return Math.min(definition.max, Math.max(definition.min, value));
}

export function validateBooleanParameter(
  id: keyof typeof BOOLEAN_PARAMETER_REGISTRY,
  value: unknown,
): boolean {
  return typeof value === 'boolean' ? value : BOOLEAN_PARAMETER_REGISTRY[id].defaultValue;
}

export function validateEnumParameter<K extends keyof typeof ENUM_PARAMETER_REGISTRY>(
  id: K,
  value: unknown,
): (typeof ENUM_PARAMETER_REGISTRY)[K]['values'][number] {
  const definition = ENUM_PARAMETER_REGISTRY[id];
  return (typeof value === 'string' && definition.values.includes(value as never)
    ? value
    : definition.defaultValue) as (typeof ENUM_PARAMETER_REGISTRY)[K]['values'][number];
}
