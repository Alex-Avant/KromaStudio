/** Origen de imagen aceptado por HalftoneCanvas: bitmap, archivo/Blob o URL. */
export type HalftoneImageSource = ImageBitmap | Blob | string;

/** Color de los puntos del semitono. */
export type HalftoneColorMode = 'color' | 'mono';

/** Aplicación tonal de la pantalla AM. */
export type HalftoneApplicationMode = 'fades' | 'knockout' | 'full';

/** Geometría disponible para los puntos de la trama. */
export type HalftoneDotShape = 'circle' | 'ellipse' | 'diamond' | 'square' | 'line';

/** Escala de la vista previa: ajustada al panel o un píxel lógico por píxel CSS. */
export type HalftonePreviewMode = 'fit' | 'actual';

/** Vista de comparación del preview: resultado, original, máscara, base blanca o wipe. */
export type HalftonePreviewView = 'result' | 'original' | 'underbase' | 'mask' | 'compare';

/** Estilo de la base blanca: tramada con la misma geometría de puntos o sólida. */
export type HalftoneUnderbaseStyle = 'dot' | 'solid';

/** Geometría física opcional solicitada para una exportación concreta. */
export interface HalftoneOutputGeometry {
  widthIn?: number;
  heightIn?: number;
  keepAspect?: boolean;
  mirror?: boolean;
}

/** Estadísticas de la imagen fuente para el preflight de exportación. */
export interface HalftoneImageStats {
  width: number;
  height: number;
  transparentRatio: number;
  partialAlphaRatio: number;
  opaqueRatio: number;
  borderOpaqueRatio: number;
  borderMeanLuma: number;
  darkOpaqueBorder: boolean;
  hasTransparency: boolean;
}

/**
 * Extremo tonal que produce la tinta. `light` imprime las zonas claras (flujo
 * de referencia de Photoshop); `dark` imprime las zonas oscuras.
 */
export type HalftonePolarity = 'light' | 'dark';

/** Parámetros del motor de semitono. */
export interface HalftoneOptions {
  /** Líneas por pulgada de la trama. */
  lpi: number;
  /** Ángulo de la rejilla en grados. */
  angle: number;
  /** Contraste aditivo centrado en cero, rango -100..100. */
  contrast: number;
  /** Brillo aditivo, rango -100..100. */
  brightness: number;
  /** Exponente de cobertura; valores mayores reducen los tonos medios. */
  gamma: number;
  /** Cobertura mínima; los puntos más débiles se descartan. */
  minDot: number;
  /** Cobertura máxima relativa de la celda (0..1). */
  maxDot: number;
  /** Umbral de sólidos configurable (0..1). */
  solidThreshold: number;
  /** Modo de aplicación de la trama. */
  applicationMode: HalftoneApplicationMode;
  /** Suavizado de la frontera de los puntos. */
  edgeSmooth: boolean;
  /** Evita el fallback de promedio cuando la celda no se resuelve. */
  edgeProtect: boolean;
  /** Habilita el umbral opcional para preservar sólidos. */
  solidEnabled: boolean;
  /** Forma geométrica de los puntos. */
  dotShape: HalftoneDotShape;
  /** Resolución de salida en píxeles por pulgada. */
  dpi: number;
  /** Color original de la imagen o monocromo negro. */
  colorMode: HalftoneColorMode;
  /** Extremo tonal que produce tinta. */
  polarity: HalftonePolarity;
  /** Punto negro de entrada en niveles 0..255. */
  blackPoint: number;
  /** Punto blanco de entrada en niveles 0..255. */
  whitePoint: number;
}

/** Parámetros de la capa de underbase blanco. */
export interface UnderbaseOptions {
  /** Si es false, la pasada de underbase devuelve transparencia. */
  enabled: boolean;
  /** Erosión de la máscara de tinta, en píxeles de salida (0 a 3). */
  choke: number;
  /** Expansión de la máscara de tinta, en píxeles de salida (0 a 3). */
  spread: number;
  /** Base tramada (misma geometría de puntos) o sólida bajo el diseño. */
  style: HalftoneUnderbaseStyle;
}

/** Props públicas de HalftoneCanvas.svelte. */
export interface HalftoneCanvasProps {
  src: HalftoneImageSource;
  lpi?: number;
  angle?: number;
  brightness?: number;
  contrast?: number;
  gamma?: number;
  minDot?: number;
  maxDot?: number;
  solidThreshold?: number;
  solidEnabled?: boolean;
  edgeSmooth?: boolean;
  edgeProtect?: boolean;
  applicationMode?: HalftoneApplicationMode;
  dotShape?: HalftoneDotShape;
  dpi?: number;
  underbase?: boolean;
  choke?: number;
  spread?: number;
  colorMode?: HalftoneColorMode;
  polarity?: HalftonePolarity;
  blackPoint?: number;
  whitePoint?: number;
  shirtColor?: string;
  showUnderbase?: boolean;
  underbaseStyle?: HalftoneUnderbaseStyle;
  outputWidth?: number;
  outputHeight?: number;
  previewMode?: HalftonePreviewMode;
  previewScale?: number;
  previewView?: HalftonePreviewView;
  /** Indica si la imagen actual ya está lista para exportar. */
  exportReady?: boolean;
  /** Estadísticas de la imagen cargada, para el preflight. */
  imageStats?: HalftoneImageStats | null;
  width?: string;
  height?: string;
}

/** Capas exportables de la herramienta DTF. */
export type HalftoneExportKind = 'color' | 'underbase' | 'composite';

export interface HalftoneExportResult {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
  /** Tiempo total de preparación, render y codificación del PNG. */
  durationMs?: number;
  /** DPI solicitado por el usuario. */
  requestedDpi?: number;
  /** DPI real tras una posible reducción por límites de la GPU. */
  effectiveDpi?: number;
  /** true si la GPU redujo los píxeles de salida. */
  downscaled?: boolean;
}

export interface HalftonePreviewCanvases {
  color: HTMLCanvasElement | null;
  underbase: HTMLCanvasElement | null;
}

/** API pública expuesta por HalftoneCanvas mediante bind:this. */
export interface HalftoneCanvasHandle {
  getPreviewCanvases(): HalftonePreviewCanvases;
  exportPng(
    kind: HalftoneExportKind,
    geometry?: HalftoneOutputGeometry,
  ): Promise<HalftoneExportResult>;
}

/**
 * Estructura compatible con el tipo `Parameter` de svader.
 * Se declara localmente porque svader no reexporta sus tipos públicos.
 */
export type SvaderParameter =
  | {
      label: string;
      binding: number;
      value: 'resolution' | 'offset' | 'scale' | 'time';
      storage?: boolean;
    }
  | {
      label: string;
      binding: number;
      value: BufferSource;
      storage?: boolean;
    };
