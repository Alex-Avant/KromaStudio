import shaderCode from '../shaders/halftone.wgsl?raw';
import type {
  HalftoneColorMode,
  HalftoneExportKind,
  HalftoneExportResult,
  HalftoneImageSource,
  SvaderParameter,
} from '../types/halftone';
import { bitmapToPackedRgba, loadImage } from './image';
import { buildHalftoneParameters, COLOR_MODE, UNDERBASE_MODE } from './parameters';

export interface HalftoneExportOptions {
  lpi: number;
  angle: number;
  contrast: number;
  dpi: number;
  underbase: boolean;
  choke: number;
  colorMode: HalftoneColorMode;
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

function exportFilename(
  kind: HalftoneExportKind,
  lpi: number,
  angle: number,
): string {
  const suffix = kind === 'underbase' ? 'white' : kind;
  return `halftone_LPI${Math.round(lpi)}_ANG${Math.round(angle)}_${suffix}.png`;
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
  kind: HalftoneExportKind,
): Promise<HalftoneExportResult> {
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
    pixels: image.pixels,
    lpi: options.lpi,
    angle: options.angle,
    contrast: options.contrast,
    dpi: options.dpi,
    underbase: options.underbase,
    choke: options.choke,
    colorMode: options.colorMode,
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

  const colorBindGroup = createBindGroup(
    device,
    pipeline.getBindGroupLayout(0),
    buildHalftoneParameters(values, COLOR_MODE),
    width,
    height,
    buffers,
    storageBuffer,
  );
  const underbaseBindGroup = createBindGroup(
    device,
    pipeline.getBindGroupLayout(0),
    buildHalftoneParameters(values, UNDERBASE_MODE),
    width,
    height,
    buffers,
    storageBuffer,
  );

  const needsColor = kind === 'color' || kind === 'composite';
  const needsUnderbase = kind === 'underbase' || kind === 'composite';

  const colorCanvas = needsColor ? createCanvas(width, height) : null;
  const underbaseCanvas = needsUnderbase ? createCanvas(width, height) : null;
  const colorContext = (colorCanvas?.getContext('webgpu') ??
    null) as GPUCanvasContext | null;
  const underbaseContext = (underbaseCanvas?.getContext('webgpu') ??
    null) as GPUCanvasContext | null;

  if ((needsColor && !colorContext) || (needsUnderbase && !underbaseContext)) {
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

    if (colorContext) draw(colorContext, colorBindGroup);
    if (underbaseContext) draw(underbaseContext, underbaseBindGroup);

    await device.queue.onSubmittedWorkDone();

    let blob: Blob;

    if (kind === 'composite') {
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
      const selectedCanvas = kind === 'color' ? colorCanvas : underbaseCanvas;
      if (!selectedCanvas) {
        throw new Error('No se pudo preparar el canvas de exportación.');
      }
      blob = await canvasToBlob(selectedCanvas);
    }

    return {
      blob,
      filename: exportFilename(kind, options.lpi, options.angle),
      width,
      height,
    };
  } finally {
    colorContext?.unconfigure();
    underbaseContext?.unconfigure();
    buffers.forEach((buffer) => buffer.destroy());
  }
}

export async function exportHalftonePng(
  source: HalftoneImageSource,
  options: HalftoneExportOptions,
  kind: HalftoneExportKind,
): Promise<HalftoneExportResult> {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    throw new Error('La exportación necesita un navegador compatible con WebGPU.');
  }

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

    const loaded = await loadImage(source);

    try {
      const image = bitmapToPackedRgba(loaded.bitmap, maxDimension);
      return await renderExport(device, image, options, kind);
    } finally {
      if (loaded.owned) loaded.bitmap.close();
    }
  } finally {
    device.destroy();
  }
}
