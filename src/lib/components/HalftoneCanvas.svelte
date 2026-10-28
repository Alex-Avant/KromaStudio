<script lang="ts">
  import { WebGpuShader } from 'svader';
  import shaderCode from '../shaders/halftone.wgsl?raw';
  import { bitmapToPackedRgba, loadImage } from '../utils/image';
  import { exportHalftonePng } from '../utils/export';
  import { buildHalftoneParameters, COLOR_MODE, UNDERBASE_MODE } from '../utils/parameters';
  import type {
    HalftoneCanvasProps,
    HalftoneExportKind,
    HalftoneExportResult,
    HalftonePreviewCanvases,
  } from '../types/halftone';

  // Props con valores por defecto para DTF.
  let {
    src,
    lpi = 45,
    angle = 45,
    contrast = 1,
    dpi = 300,
    underbase = true,
    choke = 1,
    colorMode = 'mono',
    blackPoint = 0,
    whitePoint = 1,
    shirtColor = '#111111',
    showUnderbase = true,
    width = '100%',
    height = '100%',
  }: HalftoneCanvasProps = $props();

  // Estado interno: píxeles empaquetados y metadatos de la imagen.
  let pixels = $state<Uint32Array<ArrayBuffer> | null>(null);
  let imageWidth = $state(0);
  let imageHeight = $state(0);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Carga la imagen cada vez que cambia `src`. Si el componente se destruye o
  // la fuente cambia antes de terminar, la carga en curso se descarta.
  $effect(() => {
    let cancelled = false;
    loading = true;
    error = null;

    (async () => {
      let loaded: Awaited<ReturnType<typeof loadImage>> | null = null;

      try {
        loaded = await loadImage(src);
        if (cancelled) return;

        const prepared = bitmapToPackedRgba(loaded.bitmap);

        if (cancelled) return;

        pixels = prepared.pixels;
        imageWidth = prepared.width;
        imageHeight = prepared.height;
      } catch (cause) {
        if (!cancelled) {
          pixels = null;
          error = cause instanceof Error ? cause.message : 'Error desconocido al cargar la imagen.';
        }
      } finally {
        // Sólo liberamos los bitmaps creados por nosotros (URLs o archivos/Blob).
        if (loaded?.owned) loaded.bitmap.close();
        if (!cancelled) loading = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  });

  // El builder compartido mantiene el orden de bindings de halftone.wgsl.
  const parameterValues = $derived.by(() => {
    const pixelData = pixels;
    if (!pixelData || imageWidth === 0 || imageHeight === 0) return null;

    return {
      imageWidth,
      imageHeight,
      pixels: pixelData,
      lpi,
      angle,
      contrast,
      dpi,
      underbase,
      choke,
      colorMode,
      blackPoint,
      whitePoint,
    };
  });

  // Dos pasadas con el mismo WGSL: color arriba y underbase debajo.
  const colorParameters = $derived.by(() =>
    parameterValues ? buildHalftoneParameters(parameterValues, COLOR_MODE) : [],
  );
  const underbaseParameters = $derived.by(() =>
    parameterValues ? buildHalftoneParameters(parameterValues, UNDERBASE_MODE) : [],
  );

  const aspectRatio = $derived(
    imageWidth > 0 && imageHeight > 0 ? `${imageWidth} / ${imageHeight}` : '1 / 1',
  );

  // Referencia al contenedor para exponer los canvas del preview al padre.
  let root: HTMLDivElement | null = $state(null);

  export function getPreviewCanvases(): HalftonePreviewCanvases {
    return {
      color: root?.querySelector<HTMLCanvasElement>('.color-layer canvas') ?? null,
      underbase: root?.querySelector<HTMLCanvasElement>('.underbase-layer canvas') ?? null,
    };
  }

  export function exportPng(kind: HalftoneExportKind): Promise<HalftoneExportResult> {
    return exportHalftonePng(
      src,
      {
        lpi,
        angle,
        contrast,
        dpi,
        underbase,
        choke,
        colorMode,
        blackPoint,
        whitePoint,
        shirtColor,
      },
      kind,
    );
  }
</script>

<div bind:this={root} class="halftone-canvas" style={`aspect-ratio: ${aspectRatio};`}>
  {#if error}
    <div class="status error" role="alert">
      <strong>No se pudo preparar la imagen.</strong>
      <span>{error}</span>
    </div>
  {:else if loading || !pixels}
    <div class="status">Preparando la imagen para WebGPU…</div>
  {:else}
    <!--
      svader crea sus buffers al montar y sólo actualiza valores. Al cambiar de
      imagen forzamos un remontaje con la nueva identidad de `pixels` para que
      las dos pasadas usen buffers del tamaño correcto.
    -->
    {#key pixels}
      <!--
        Capa inferior: underbase blanco erosionado (choke). Se mantiene montada
        para que getPreviewCanvases() siempre pueda devolver ambos canvas; el
        checkbox de preview sólo la oculta visualmente.
      -->
      <div
        class="layer underbase-layer"
        class:hidden={!underbase || !showUnderbase}
        aria-hidden="true"
      >
        <WebGpuShader
          {width}
          {height}
          code={shaderCode}
          parameters={underbaseParameters}
        >
          <div class="fallback"></div>
        </WebGpuShader>
      </div>

      <!-- Capa superior: puntos negros con alfa transparente entre ellos. -->
      <div class="layer color-layer">
        <WebGpuShader
          {width}
          {height}
          code={shaderCode}
          parameters={colorParameters}
        >
          <div class="fallback">
            <strong>WebGPU no está disponible.</strong>
            <span>
              Este prototipo necesita un navegador compatible con WebGPU
              (Chrome/Edge 113+ o Safari 18+).
            </span>
          </div>
        </WebGpuShader>
      </div>
    {/key}
  {/if}
</div>

<style>
  .halftone-canvas {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    isolation: isolate;
  }

  .layer {
    position: absolute;
    inset: 0;
  }

  .underbase-layer {
    z-index: 0;
  }

  .underbase-layer.hidden {
    visibility: hidden;
  }

  .color-layer {
    z-index: 1;
  }

  .status,
  .fallback {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 1.5rem;
    text-align: center;
    font: 0.9rem/1.4 system-ui, sans-serif;
    color: #e9e4dc;
    background: rgba(10, 11, 14, 0.72);
    backdrop-filter: blur(6px);
  }

  .status {
    position: absolute;
    inset: 0;
  }

  .error {
    color: #ffb4a8;
  }

  .fallback strong {
    color: #fff;
  }

  .fallback span {
    max-width: 34ch;
    opacity: 0.8;
  }
</style>
