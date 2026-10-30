<script lang="ts">
  import { onDestroy } from 'svelte';
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
    gamma = 1,
    minDot = 0.01,
    shadowPoint = 0.97,
    dotShape = 'circle',
    dpi = 300,
    underbase = true,
    choke = 1,
    colorMode = 'mono',
    blackPoint = 0,
    whitePoint = 1,
    shirtColor = '#111111',
    showUnderbase = true,
    previewMode = 'fit',
    width = '100%',
    height = '100%',
  }: HalftoneCanvasProps = $props();

  // Estado interno: píxeles empaquetados y metadatos de la imagen.
  let pixels = $state<Uint32Array<ArrayBuffer> | null>(null);
  let imageWidth = $state(0);
  let imageHeight = $state(0);
  let logicalWidth = $state(0);
  let logicalHeight = $state(0);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Bitmap original retenido para la exportación: así no hay que volver a
  // decodificar el archivo (algunos pickers de Android no permiten hacerlo
  // más tarde). Sólo cerramos los bitmaps que creamos nosotros.
  let activeBitmap = $state<ImageBitmap | null>(null);
  let activeOwned = $state(false);

  onDestroy(() => {
    if (activeOwned && activeBitmap) activeBitmap.close();
  });

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

        if (activeBitmap !== null && activeBitmap !== loaded.bitmap && activeOwned) {
          activeBitmap.close();
        }
        activeBitmap = loaded.bitmap;
        activeOwned = loaded.owned;

        pixels = prepared.pixels;
        imageWidth = prepared.width;
        imageHeight = prepared.height;
        logicalWidth = prepared.logicalWidth;
        logicalHeight = prepared.logicalHeight;
      } catch (cause) {
        if (!cancelled) {
          pixels = null;
          error = cause instanceof Error ? cause.message : 'Error desconocido al cargar la imagen.';
        }
      } finally {
        // Sólo liberamos los bitmaps creados por nosotros que no quedaron
        // retenidos para la exportación.
        if (loaded?.owned && loaded.bitmap !== activeBitmap) {
          loaded.bitmap.close();
        }
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
      outputWidth: logicalWidth,
      outputHeight: logicalHeight,
      pixels: pixelData,
      lpi,
      angle,
      contrast,
      gamma,
      minDot,
      shadowPoint,
      dotShape,
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
    logicalWidth > 0 && logicalHeight > 0 ? `${logicalWidth} / ${logicalHeight}` : '1 / 1',
  );
  const viewportStyle = $derived(
    previewMode === 'actual' && logicalWidth > 0 && logicalHeight > 0
      ? `aspect-ratio: ${aspectRatio}; width: ${logicalWidth}px; height: ${logicalHeight}px;`
      : `aspect-ratio: ${aspectRatio};`,
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
        gamma,
        minDot,
        shadowPoint,
        dotShape,
        dpi,
        underbase,
        choke,
        colorMode,
        blackPoint,
        whitePoint,
        shirtColor,
      },
      kind,
      activeBitmap ?? undefined,
    );
  }
</script>

<div bind:this={root} class="halftone-canvas" style={viewportStyle}>
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
