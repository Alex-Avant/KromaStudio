import shaderCode from '../shaders/halftone.wgsl?raw';
import type {
  HalftoneColorMode,
  HalftoneDotShape,
  HalftoneExportKind,
  HalftoneExportResult,
  HalftoneImageSource,
  HalftonePolarity,
  HalftoneUnderbaseStyle,
  SvaderParameter,
} from '../types/halftone';
import { bitmapToPackedRgba, loadImage, type PackedImage } from './image';
import { buildHalftoneParameters, COLOR_MODE, UNDERBASE_MODE } from './parameters';
import { addPngDpi } from './png';

export interface HalftoneExportOptions {
  lpi: number;
  angle: number;
  contrast: number;
  gamma: number;
  minDot: number;
  shadowPoint: number;
  dotShape: HalftoneDotShape;
  dpi: number;
  underbase: boolean;
  choke: number;
  underbaseStyle: HalftoneUnderbaseStyle;
  colorMode: HalftoneColorMode;
  polarity: HalftonePolarity;
  blackPoint: number;
  whitePoint: number;
  shirtColor: string;
}

// TypeScript DOM incluye los tipos WebGPU pero no los valores globales de
// GPUBufferUsage; estos flags son los definidos por la especificación.
const BUFFER_USAGE = {
  COPY_DST: 0x0008,
  VERTEX: 0x0020,
  UNIFORM: 0x0040,
  STORAGE: 0x0080,
} as const;

const VERTICES = new Float32Array([
  -1, -1, 1, -1, 1, 1,
  -1, -1, 1, 1, -1, 1,
]);

const VERTEX_SHADER = `
  @vertex
  fn vertexMain(@location(0) pos: vec2f) -> @builtin(position) vec4<f32> {
    return vec4<f32>(pos, 0.0, 1.0);
  }
`;

function formatValue(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatPercent(value: number, digits = 0): string {
  const scaled = Math.max(0, value) * 100;
  return digits > 0 ? scaled.toFixed(digits) : String(Math.round(scaled));
}

export function exportFilename(
  kind: HalftoneExportKind,
  options: HalftoneExportOptions,
  metrics?: ExportMetrics,
): string {
  const suffix = kind === 'underbase' ? 'white' : kind;
  const dpiLabel = metrics?.downscaled
    ? `${Math.round(metrics.requestedDpi)}DPI_eff${Math.round(metrics.effectiveDpi)}DPI`
    : `${Math.round(options.dpi)}DPI`;
  const parts = [
    'kroma',
    options.dotShape,
    `LPI${Math.round(options.lpi)}`,
    `ANG${formatValue(options.angle)}`,
    dpiLabel,
    `C${formatValue(options.contrast)}`,
    `G${formatValue(options.gamma)}`,
    `MD${formatPercent(options.minDot, 1)}`,
    `SH${formatPercent(options.shadowPoint)}`,
    `BP${formatPercent(options.blackPoint)}`,
    `WP${formatPercent(options.whitePoint)}`,
  ];

  // El choke y el tipo de base solo afectan a blanco y composite.
  if (kind !== 'color' && options.underbase) {
    parts.push(
      `CHK${formatValue(options.choke)}`,
      options.underbaseStyle === 'solid' ? 'solid' : 'dot',
    );
  }

  parts.push(options.polarity === 'dark' ? 'dark' : 'light', suffix);
  return `${parts.join('_')}.png`;
}

export type HalftoneExportResults = Partial<Record<HalftoneExportKind, HalftoneExportResult>>;

interface ExportPasses {
  color: boolean;
  underbase: boolean;
}

/**
 * Decide qué pasadas GPU hacen falta. Una exportación Color no debe preparar
 * el underbase, y un composite sin base solo necesita la pasada de color.
 */
export function requiredPasses(
  kinds: readonly HalftoneExportKind[],
  options: Pick<HalftoneExportOptions, 'underbase'>,
): ExportPasses {
  const requested = new Set(kinds);
  const composite = requested.has('composite');
  return {
    color: requested.has('color') || composite,
    underbase: requested.has('underbase') || (composite && options.underbase),
  };
}

export interface ExportMetrics {
  requestedDpi: number;
  effectiveDpi: number;
  exportScale: number;
  exportPitch: number;
  downscaled: boolean;
}

/**
 * Calcula la geometría real de salida. Si la GPU redujo el buffer, el DPI
 * efectivo baja para conservar el tamaño físico y el LPI; las dimensiones
 * físicas se derivan de las dimensiones lógicas originales.
 */
export function exportMetricsFor(
  image: Pick<PackedImage, 'width' | 'height' | 'logicalWidth' | 'logicalHeight'>,
  requestedDpi: number,
  lpi: number,
): ExportMetrics {
  const safeDpi = Math.max(1, requestedDpi);
  const safeLpi = Math.max(1, lpi);
  const exportScale = Math.min(
    image.width / Math.max(1, image.logicalWidth),
    image.height / Math.max(1, image.logicalHeight),
  );
  return {
    requestedDpi: safeDpi,
    effectiveDpi: safeDpi * exportScale,
    exportScale,
    exportPitch: (safeDpi / safeLpi) * exportScale,
    downscaled: exportScale < 0.999999,
  };
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('No se pudo generar el PNG de exportación.'));
    }, 'image/png');
  });
}

function parameterData(
  parameter: SvaderParameter,
  width: number,
  height: number,
): BufferSource {
  if (parameter.value === 'resolution') {
    return new Float32Array([width, height]);
  }
  if (parameter.value === 'offset') {
    return new Float32Array([0, 0]);
  }
  if (typeof parameter.value === 'string') {
    throw new Error(`Parámetro de shader no soportado: ${parameter.value}`);
  }
  return parameter.value;
}

function createBindGroup(
  device: GPUDevice,
  layout: GPUBindGroupLayout,
  parameters: SvaderParameter[],
  width: number,
  height: number,
  buffers: GPUBuffer[],
  sharedStorage: GPUBuffer,
): GPUBindGroup {
  const entries: GPUBindGroupEntry[] = parameters.map((parameter) => {
    const data = parameterData(parameter, width, height);
    const storage = parameter.storage ?? false;
    const buffer = storage
      ? sharedStorage
      : device.createBuffer({
          label: `${parameter.label} de exportación`,
          size: data.byteLength,
          usage: BUFFER_USAGE.COPY_DST | BUFFER_USAGE.UNIFORM,
        });

    if (!storage) {
      device.queue.writeBuffer(buffer, 0, data);
      buffers.push(buffer);
    }

    return { binding: parameter.binding, resource: { buffer } };
  });

  return device.createBindGroup({
    label: 'Bind group de exportación',
    layout,
    entries,
  });
}

async function renderExport(
  device: GPUDevice,
  image: ReturnType<typeof bitmapToPackedRgba>,
  options: HalftoneExportOptions,
  kinds: readonly HalftoneExportKind[],
): Promise<HalftoneExportResults> {
  const width = image.width;
  const height = image.height;

  if (width > device.limits.maxTextureDimension2D || height > device.limits.maxTextureDimension2D) {
    throw new Error(
      `La imagen de exportación (${width}×${height}) supera el máximo de esta GPU.`,
    );
  }
  if (image.pixels.byteLength > device.limits.maxStorageBufferBindingSize) {
    throw new Error('La imagen es demasiado grande para el storage buffer de esta GPU.');
  }

  const metrics = exportMetricsFor(image, options.dpi, options.lpi);
  if (metrics.exportPitch < 1) {
    throw new Error(
      `La trama necesita ${metrics.exportPitch.toFixed(2)} px por celda en esta exportación. ` +
        'Sube los DPI, baja los LPI o usa una imagen de mayor resolución.',
    );
  }

  const format = navigator.gpu.getPreferredCanvasFormat();
  const shaderModule = device.createShaderModule({
    label: 'Halftone export fragment shader',
    code: shaderCode,
  });
  const vertexModule = device.createShaderModule({
    label: 'Halftone export vertex shader',
    code: VERTEX_SHADER,
  });
  const compilation = await shaderModule.getCompilationInfo();
  const errors = compilation.messages.filter((message) => message.type === 'error');
  if (errors.length > 0) {
    const detail = errors
      .map((message) => `línea ${message.lineNum}: ${message.message}`)
      .join('\n');
    throw new Error(`El shader no compiló:\n${detail}`);
  }

  const vertexBuffer = device.createBuffer({
    label: 'Export screen quad',
    size: VERTICES.byteLength,
    usage: BUFFER_USAGE.VERTEX | BUFFER_USAGE.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, VERTICES);

  const pipeline = device.createRenderPipeline({
    label: 'Halftone export pipeline',
    layout: 'auto',
    vertex: {
      module: vertexModule,
      entryPoint: 'vertexMain',
      buffers: [
        {
          arrayStride: 8,
          attributes: [{ format: 'float32x2', offset: 0, shaderLocation: 0 }],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'main',
      targets: [{ format }],
    },
  });

  const values = {
    imageWidth: width,
    imageHeight: height,
    outputWidth: image.logicalWidth,
    outputHeight: image.logicalHeight,
    pixels: image.pixels,
    lpi: options.lpi,
    angle: options.angle,
    contrast: options.contrast,
    gamma: options.gamma,
    minDot: options.minDot,
    shadowPoint: options.shadowPoint,
    dotShape: options.dotShape,
    dpi: options.dpi,
    underbase: options.underbase,
    choke: options.choke,
    underbaseStyle: options.underbaseStyle,
    colorMode: options.colorMode,
    polarity: options.polarity,
    blackPoint: options.blackPoint,
    whitePoint: options.whitePoint,
  };

  const buffers: GPUBuffer[] = [vertexBuffer];
  const storageBuffer = device.createBuffer({
    label: 'Píxeles RGBA de exportación',
    size: image.pixels.byteLength,
    usage: BUFFER_USAGE.STORAGE | BUFFER_USAGE.COPY_DST,
  });
  device.queue.writeBuffer(storageBuffer, 0, image.pixels);
  buffers.push(storageBuffer);

  const passes = requiredPasses(kinds, options);

  const colorBindGroup = passes.color
    ? createBindGroup(
        device,
        pipeline.getBindGroupLayout(0),
        buildHalftoneParameters(values, COLOR_MODE),
        width,
        height,
        buffers,
        storageBuffer,
      )
    : null;
  const underbaseBindGroup = passes.underbase
    ? createBindGroup(
        device,
        pipeline.getBindGroupLayout(0),
        buildHalftoneParameters(values, UNDERBASE_MODE),
        width,
        height,
        buffers,
        storageBuffer,
      )
    : null;

  const colorCanvas = passes.color ? createCanvas(width, height) : null;
  const underbaseCanvas = passes.underbase ? createCanvas(width, height) : null;
  const colorContext = (colorCanvas?.getContext('webgpu') ??
    null) as GPUCanvasContext | null;
  const underbaseContext = (underbaseCanvas?.getContext('webgpu') ??
    null) as GPUCanvasContext | null;

  if ((passes.color && !colorContext) || (passes.underbase && !underbaseContext)) {
    buffers.forEach((buffer) => buffer.destroy());
    throw new Error('No se pudo crear el contexto WebGPU de exportación.');
  }

  colorContext?.configure({ device, format, alphaMode: 'premultiplied' });
  underbaseContext?.configure({ device, format, alphaMode: 'premultiplied' });

  try {
    const draw = (context: GPUCanvasContext, bindGroup: GPUBindGroup) => {
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      });

      pass.setPipeline(pipeline);
      pass.setVertexBuffer(0, vertexBuffer);
      pass.setBindGroup(0, bindGroup);
      pass.draw(6);
      pass.end();
      device.queue.submit([encoder.finish()]);
    };

    if (colorContext && colorBindGroup) draw(colorContext, colorBindGroup);
    if (underbaseContext && underbaseBindGroup) draw(underbaseContext, underbaseBindGroup);

    await device.queue.onSubmittedWorkDone();

    const results: HalftoneExportResults = {};
    for (const requested of new Set(kinds)) {
      let blob: Blob;

      if (requested === 'composite') {
        const compositeCanvas = createCanvas(width, height);
        const context = compositeCanvas.getContext('2d');
        if (!context) throw new Error('No se pudo crear el canvas de composición.');

        context.fillStyle = options.shirtColor;
        context.fillRect(0, 0, width, height);
        if (options.underbase && underbaseCanvas) {
          context.drawImage(underbaseCanvas, 0, 0);
        }
        if (colorCanvas) context.drawImage(colorCanvas, 0, 0);
        blob = await canvasToBlob(compositeCanvas);
      } else {
        const selectedCanvas = requested === 'color' ? colorCanvas : underbaseCanvas;
        if (!selectedCanvas) {
          throw new Error('No se pudo preparar el canvas de exportación.');
        }
        blob = await canvasToBlob(selectedCanvas);
      }

      // Conserva el tamaño físico en el PNG (pHYs). Si la GPU redujo los
      // píxeles, baja el DPI efectivo para mantener pulgadas y LPI reales.
      blob = await addPngDpi(blob, metrics.effectiveDpi);
      results[requested] = {
        blob,
        filename: exportFilename(requested, options, metrics),
        width,
        height,
        requestedDpi: metrics.requestedDpi,
        effectiveDpi: metrics.effectiveDpi,
        downscaled: metrics.downscaled,
      };
    }

    return results;
  } finally {
    colorContext?.unconfigure();
    underbaseContext?.unconfigure();
    buffers.forEach((buffer) => buffer.destroy());
  }
}

/**
 * Exporta una o varias capas con un único dispositivo, pipeline y empaquetado
 * de la imagen. La hoja de calibración usa esta entrada para no repetir todo el
 * trabajo de GPU tres veces.
 */
export async function exportHalftoneLayers(
  source: HalftoneImageSource,
  options: HalftoneExportOptions,
  kinds: readonly HalftoneExportKind[],
  preferredSource?: ImageBitmap,
): Promise<HalftoneExportResults> {
  if (kinds.length === 0) {
    throw new Error('No hay capas para exportar.');
  }
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    throw new Error('La exportación necesita un navegador compatible con WebGPU.');
  }

  const startedAt = performance.now();
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('No se pudo obtener un adaptador WebGPU.');

  const device = await adapter.requestDevice();

  try {
    // Exportamos a la resolución original mientras quepa en un único storage
    // buffer y en la textura máxima de la GPU. No usamos el tamaño del preview.
    const maxPixels = Math.floor(device.limits.maxStorageBufferBindingSize / 4);
    const maxDimension = Math.max(
      1,
      Math.min(
        device.limits.maxTextureDimension2D,
        Math.floor(Math.sqrt(maxPixels)),
      ),
    );

    // El bitmap ya decodificado por el preview evita volver a decodificar el
    // archivo; si ya no es válido (cerrado), caemos a la fuente original.
    const bitmapIsValid =
      preferredSource !== undefined &&
      preferredSource.width > 0 &&
      preferredSource.height > 0;
    const loaded = bitmapIsValid
      ? await loadImage(preferredSource)
      : await loadImage(source);

    try {
      const image = bitmapToPackedRgba(loaded.bitmap, maxDimension);
      const results = await renderExport(device, image, options, kinds);
      const durationMs = performance.now() - startedAt;
      for (const result of Object.values(results)) {
        if (result) result.durationMs = durationMs;
      }
      return results;
    } finally {
      if (loaded.owned) loaded.bitmap.close();
    }
  } finally {
    device.destroy();
  }
}

export async function exportHalftonePng(
  source: HalftoneImageSource,
  options: HalftoneExportOptions,
  kind: HalftoneExportKind,
  preferredSource?: ImageBitmap,
): Promise<HalftoneExportResult> {
  const results = await exportHalftoneLayers(source, options, [kind], preferredSource);
  const result = results[kind];
  if (!result) {
    throw new Error('No se pudo generar la capa solicitada.');
  }
  return result;
}
