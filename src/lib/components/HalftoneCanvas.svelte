<script lang="ts">
  import { onDestroy } from 'svelte';
  import { WebGpuShader } from 'svader';
  import shaderCode from '../shaders/halftone.wgsl?raw';
  import { analyzePackedRgba, bitmapToPackedRgba, loadImage } from '../utils/image';
  import { exportHalftonePng } from '../utils/export';
  import { buildHalftoneParameters, COLOR_MODE, MASK_MODE, UNDERBASE_MODE } from '../utils/parameters';
  import type {
    HalftoneCanvasProps,
    HalftoneExportKind,
    HalftoneExportResult,
    HalftoneImageStats,
    HalftoneOutputGeometry,
    HalftonePreviewCanvases,
  } from '../types/halftone';

  // Props con valores por defecto para DTF.
  let {
    src,
    lpi = 35,
    angle = 22.5,
    brightness = 0,
    contrast = 0,
    gamma = 1,
    minDot = 0.08,
    maxDot = 1,
    solidThreshold = 0.98,
    solidEnabled = false,
    edgeSmooth = true,
    edgeProtect = true,
    applicationMode = 'fades',
    dotShape = 'circle',
    dpi = 300,
    underbase = true,
    choke = 1,
    spread = 0,
    colorMode = 'color',
    polarity = 'light',
    blackPoint = 0,
    whitePoint = 255,
    shirtColor = '#111111',
    showUnderbase = true,
    underbaseStyle = 'dot',
    previewMode = 'fit',
    previewView = 'result',
    outputWidth,
    outputHeight,
    exportReady = $bindable(false),
    imageStats = $bindable<HalftoneImageStats | null>(null),
    width = '100%',
    height = '100%',
  }: HalftoneCanvasProps = $props();

  // Estado interno: píxeles empaquetados y metadatos de la imagen.
  let pixels = $state<Uint32Array<ArrayBuffer> | null>(null);
  let imageWidth = $state(0);
  let imageHeight = $state(0);
  let sourceLogicalWidth = $state(0);
  let sourceLogicalHeight = $state(0);
  const logicalWidth = $derived(outputWidth && outputWidth > 0 ? outputWidth : sourceLogicalWidth);
  const logicalHeight = $derived(outputHeight && outputHeight > 0 ? outputHeight : sourceLogicalHeight);
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
    exportReady = false;
    imageStats = null;
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
        sourceLogicalWidth = prepared.logicalWidth;
        sourceLogicalHeight = prepared.logicalHeight;
        imageStats = analyzePackedRgba(
          prepared.pixels,
          prepared.width,
          prepared.height,
          prepared.logicalWidth,
          prepared.logicalHeight,
        );
        exportReady = true;
      } catch (cause) {
        if (!cancelled) {
          pixels = null;
          imageStats = null;
          error = cause instanceof Error ? cause.message : 'Error desconocido al cargar la imagen.';

          // Sin bitmap retenido no se puede exportar una imagen anterior.
          if (activeOwned && activeBitmap) activeBitmap.close();
          activeBitmap = null;
          activeOwned = false;
          exportReady = false;
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
      brightness,
      contrast,
      gamma,
      minDot,
      maxDot,
      solidThreshold,
      solidEnabled,
      edgeSmooth,
      edgeProtect,
      applicationMode,
      dotShape,
      dpi,
      underbase,
      choke,
      spread,
      underbaseStyle,
      colorMode,
      polarity,
      blackPoint,
      whitePoint,
    };
  });

  // Pasadas con el mismo WGSL: color, underbase y máscara de impresión.
  const colorParameters = $derived.by(() =>
    parameterValues ? buildHalftoneParameters(parameterValues, COLOR_MODE) : [],
  );
  const underbaseParameters = $derived.by(() =>
    parameterValues ? buildHalftoneParameters(parameterValues, UNDERBASE_MODE) : [],
  );
  const maskParameters = $derived.by(() =>
    parameterValues ? buildHalftoneParameters(parameterValues, MASK_MODE) : [],
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
  let originalCanvas: HTMLCanvasElement | null = $state(null);
  let comparePosition = $state(50);
  let splitting = $state(false);
  let panning = $state(false);
  let panScroller: HTMLElement | null = null;
  let panStart = { x: 0, y: 0, left: 0, top: 0 };

  // La vista «original» y la comparación dibujan el bitmap fuente con las
  // mismas dimensiones que el buffer del preview, para que la diferencia
  // visible sea la trama y no un reescalado distinto.
  $effect(() => {
    if (
      (previewView !== 'original' && previewView !== 'compare') ||
      !activeBitmap ||
      !originalCanvas
    ) {
      return;
    }

    originalCanvas.width = Math.max(1, imageWidth);
    originalCanvas.height = Math.max(1, imageHeight);
    originalCanvas
      .getContext('2d')
      ?.drawImage(activeBitmap, 0, 0, originalCanvas.width, originalCanvas.height);
  });

  function updateComparePosition(clientX: number) {
    if (!root) return;
    const rect = root.getBoundingClientRect();
    comparePosition = Math.min(98, Math.max(2, ((clientX - rect.left) / rect.width) * 100));
  }

  function startSplit(event: PointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    splitting = true;
    try {
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    } catch {
      // Punteros sintéticos o navegadores sin captura: seguimos con el drag.
    }
    updateComparePosition(event.clientX);
  }

  function moveSplit(event: PointerEvent) {
    if (!splitting) return;
    updateComparePosition(event.clientX);
  }

  function endSplit(event: PointerEvent) {
    splitting = false;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    } catch {
      // La captura pudo no haberse concedido.
    }
  }

  function handleSplitKey(event: KeyboardEvent) {
    const step = event.shiftKey ? 5 : 1;
    if (event.key === 'ArrowLeft') {
      comparePosition = Math.max(2, comparePosition - step);
      event.preventDefault();
    } else if (event.key === 'ArrowRight') {
      comparePosition = Math.min(98, comparePosition + step);
      event.preventDefault();
    }
  }

  function startPan(event: PointerEvent) {
    if (previewMode !== 'actual' || !root) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const scroller = root.closest('.checkerboard');
    if (!(scroller instanceof HTMLElement)) return;

    panning = true;
    panScroller = scroller;
    panStart = {
      x: event.clientX,
      y: event.clientY,
      left: scroller.scrollLeft,
      top: scroller.scrollTop,
    };
    try {
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    } catch {
      // La captura no es indispensable para mover el scroll.
    }
  }

  function movePan(event: PointerEvent) {
    if (!panning || !panScroller) return;
    panScroller.scrollLeft = panStart.left - (event.clientX - panStart.x);
    panScroller.scrollTop = panStart.top - (event.clientY - panStart.y);
  }

  function endPan(event: PointerEvent) {
    if (!panning) return;
    panning = false;
    panScroller = null;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    } catch {
      // La captura pudo no haberse concedido.
    }
  }

  export function getPreviewCanvases(): HalftonePreviewCanvases {
    return {
      color: root?.querySelector<HTMLCanvasElement>('.color-layer canvas') ?? null,
      underbase: root?.querySelector<HTMLCanvasElement>('.underbase-layer canvas') ?? null,
    };
  }

  export function exportPng(
    kind: HalftoneExportKind,
    geometry?: HalftoneOutputGeometry,
  ): Promise<HalftoneExportResult> {
    if (!exportReady || !activeBitmap) {
      return Promise.reject(
        new Error('La imagen todavía se está preparando. Espera a que la vista previa termine.'),
      );
    }

    return exportHalftonePng(
      src,
      {
        lpi,
        angle,
        brightness,
        contrast,
        gamma,
        minDot,
        maxDot,
        solidThreshold,
        solidEnabled,
        edgeSmooth,
        edgeProtect,
        applicationMode,
        dotShape,
        dpi,
        underbase,
        choke,
        spread,
        underbaseStyle,
        colorMode,
        polarity,
        blackPoint,
        whitePoint,
        shirtColor,
      },
      kind,
      activeBitmap ?? undefined,
      geometry,
    );
  }
</script>

<div
  bind:this={root}
  class="halftone-canvas"
  class:actual-pan={previewMode === 'actual'}
  class:panning
  role="group"
  aria-label="Vista previa del semitono con paneo"
  style={`${viewportStyle} --compare-split: ${comparePosition}%;`}
  onpointerdown={startPan}
  onpointermove={movePan}
  onpointerup={endPan}
  onpointercancel={endPan}
>
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
        para que getPreviewCanvases() siempre pueda devolver ambos canvas; los
        selectores de vista sólo la ocultan visualmente.
      -->
      <div
        class="layer underbase-layer"
        class:hidden={!underbase || !showUnderbase || (previewView !== 'result' && previewView !== 'underbase' && previewView !== 'compare')}
        class:compare-clipped={previewView === 'compare'}
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
      <div
        class="layer color-layer"
        class:hidden={previewView === 'underbase' || previewView === 'mask' || previewView === 'original'}
        class:compare-clipped={previewView === 'compare'}
      >
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

      {#if previewView === 'mask'}
        <!-- Máscara de impresión: la cobertura de tinta en gris premultiplicado. -->
        <div class="layer mask-layer">
          <WebGpuShader
            {width}
            {height}
            code={shaderCode}
            parameters={maskParameters}
          >
            <div class="fallback"></div>
          </WebGpuShader>
        </div>
      {/if}

      {#if previewView === 'original' || previewView === 'compare'}
        <canvas
          bind:this={originalCanvas}
          class="layer original-layer"
          class:compare-original={previewView === 'compare'}
        ></canvas>
      {/if}

      {#if previewView === 'compare'}
        <div class="compare-divider" style={`left: ${comparePosition}%;`}>
          <div
            class="compare-handle"
            role="slider"
            tabindex="0"
            aria-label="Mover divisor de comparación"
            aria-orientation="horizontal"
            aria-valuemin="2"
            aria-valuemax="98"
            aria-valuenow={Math.round(comparePosition)}
            onpointerdown={startSplit}
            onpointermove={moveSplit}
            onpointerup={endSplit}
            onpointercancel={endSplit}
            onkeydown={handleSplitKey}
          >
            <span aria-hidden="true"></span>
          </div>
        </div>
        <span class="compare-chip original-chip">Original</span>
        <span class="compare-chip result-chip">Resultado</span>
      {/if}
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

  .color-layer {
    z-index: 1;
  }

  .mask-layer {
    z-index: 1;
  }

  .layer.hidden {
    visibility: hidden;
  }

  .original-layer {
    z-index: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .layer.compare-clipped {
    clip-path: inset(0 0 0 var(--compare-split));
  }

  .original-layer.compare-original {
    clip-path: inset(0 calc(100% - var(--compare-split)) 0 0);
  }

  .compare-divider {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 4;
    width: 2px;
    margin-left: -1px;
    background: var(--cyan);
    pointer-events: none;
  }

  .compare-handle {
    position: absolute;
    top: 50%;
    left: 50%;
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    border: 2px solid var(--cyan);
    border-radius: 50%;
    background: rgba(16, 18, 22, 0.92);
    color: var(--cyan);
    cursor: ew-resize;
    pointer-events: auto;
    touch-action: none;
    transform: translate(-50%, -50%);
  }

  .compare-handle span {
    width: 0.9rem;
    height: 0.9rem;
    border-right: 2px solid currentColor;
    border-left: 2px solid currentColor;
  }

  .compare-handle:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 3px;
  }

  .compare-chip {
    position: absolute;
    top: 0.6rem;
    z-index: 5;
    padding: 0.25rem 0.55rem;
    border-radius: 999px;
    background: rgb(16 19 27 / 78%);
    color: var(--text);
    font: 0.7rem/1.2 ui-monospace, monospace;
    letter-spacing: 0.04em;
    pointer-events: none;
  }

  .original-chip {
    left: 0.6rem;
  }

  .result-chip {
    right: 0.6rem;
  }

  .halftone-canvas.actual-pan {
    cursor: grab;
    touch-action: none;
  }

  .halftone-canvas.actual-pan.panning {
    cursor: grabbing;
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
    color: var(--text);
    background: rgb(16 19 27 / 78%);
    backdrop-filter: blur(6px);
  }

  .status {
    position: absolute;
    inset: 0;
  }

  .error {
    color: var(--error);
  }

  .fallback strong {
    color: #fff;
  }

  .fallback span {
    max-width: 34ch;
    opacity: 0.8;
  }
</style>
