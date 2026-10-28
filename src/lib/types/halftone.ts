/** Origen de imagen aceptado por HalftoneCanvas: bitmap, archivo/Blob o URL. */
export type HalftoneImageSource = ImageBitmap | Blob | string;

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
}

/** Parámetros de la capa de underbase blanco. */
export interface UnderbaseOptions {
  /** Si es false, la pasada de underbase devuelve transparencia. */
  enabled: boolean;
  /** Erosión de la máscara alfa, en píxeles del canvas de salida (0 a 2). */
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
  width?: string;
  height?: string;
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
