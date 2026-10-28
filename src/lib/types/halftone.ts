/** Origen de imagen aceptado por HalftoneCanvas: bitmap, archivo/Blob o URL. */
export type HalftoneImageSource = ImageBitmap | Blob | string;

/** Color de los puntos del semitono. */
export type HalftoneColorMode = 'color' | 'mono';

/** Parámetros del motor de semitono. */
export interface HalftoneOptions {
  /** Líneas por pulgada de la trama. DTF suele trabajar entre 35 y 60 LPI. */
  lpi: number;
  /** Ángulo de la rejilla en grados. */
  angle: number;
  /** Multiplicador de contraste alrededor de 0.5. 1 = sin cambios. */
  contrast: number;
  /** Resolución de salida en píxeles por pulgada. */
  dpi: number;
  /** Color original de la imagen o monocromo negro. */
  colorMode: HalftoneColorMode;
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
}

/** Props públicas de HalftoneCanvas.svelte. */
export interface HalftoneCanvasProps {
  src: HalftoneImageSource;
  lpi?: number;
  angle?: number;
  contrast?: number;
  dpi?: number;
  underbase?: boolean;
  choke?: number;
  colorMode?: HalftoneColorMode;
  blackPoint?: number;
  whitePoint?: number;
  shirtColor?: string;
  showUnderbase?: boolean;
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
