/** Origen de imagen aceptado por HalftoneCanvas: bitmap, archivo/Blob o URL. */
export type HalftoneImageSource = ImageBitmap | Blob | string;

/** Color de los puntos del semitono. */
export type HalftoneColorMode = 'color' | 'mono';

/** Geometría disponible para los puntos de la trama. */
export type HalftoneDotShape = 'circle' | 'ellipse' | 'diamond' | 'square' | 'line';

/** Escala de la vista previa: ajustada al panel o un píxel lógico por píxel CSS. */
export type HalftonePreviewMode = 'fit' | 'actual';

/** Vista de comparación del preview: resultado, original, máscara, base blanca o wipe. */
export type HalftonePreviewView = 'result' | 'original' | 'underbase' | 'mask' | 'compare';

/** Estilo de la base blanca: tramada con la misma geometría de puntos o sólida. */
export type HalftoneUnderbaseStyle = 'dot' | 'solid';

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
  /** Líneas por pulgada de la trama. DTF suele trabajar entre 35 y 60 LPI. */
  lpi: number;
  /** Ángulo de la rejilla en grados. */
  angle: number;
  /** Multiplicador de contraste alrededor de 0.5. 1 = sin cambios. */
  contrast: number;
  /** Exponente de cobertura; valores mayores reducen los tonos medios. */
  gamma: number;
  /** Cobertura mínima; los puntos más débiles se descartan. */
  minDot: number;
  /** Cobertura a partir de la cual la celda se vuelve sólida. */
  shadowPoint: number;
  /** Forma geométrica de los puntos. */
  dotShape: HalftoneDotShape;
  /** Resolución de salida en píxeles por pulgada. */
  dpi: number;
  /** Color original de la imagen o monocromo negro. */
  colorMode: HalftoneColorMode;
  /** Extremo tonal que produce tinta. */
  polarity: HalftonePolarity;
  /** Luminancia por debajo de la cual el píxel se vuelve transparente. */
  blackPoint: number;
  /** Luminancia que se remapea a blanco para aumentar el contraste. */
  whitePoint: number;
}

/** Parámetros de la capa de underbase blanco. */
export interface UnderbaseOptions {
  /** Si es false, la pasada de underbase devuelve transparencia. */
  enabled: boolean;
  /** Erosión de la máscara de tinta, en píxeles de salida (0 a 3). */
  choke: number;
  /** Base tramada (misma geometría de puntos) o sólida bajo el diseño. */
  style: HalftoneUnderbaseStyle;
}

/** Props públicas de HalftoneCanvas.svelte. */
export interface HalftoneCanvasProps {
  src: HalftoneImageSource;
  lpi?: number;
  angle?: number;
  contrast?: number;
  gamma?: number;
  minDot?: number;
  shadowPoint?: number;
  dotShape?: HalftoneDotShape;
  dpi?: number;
  underbase?: boolean;
  choke?: number;
  colorMode?: HalftoneColorMode;
  polarity?: HalftonePolarity;
  blackPoint?: number;
  whitePoint?: number;
  shirtColor?: string;
  showUnderbase?: boolean;
  underbaseStyle?: HalftoneUnderbaseStyle;
  previewMode?: HalftonePreviewMode;
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
  exportPng(kind: HalftoneExportKind): Promise<HalftoneExportResult>;
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
