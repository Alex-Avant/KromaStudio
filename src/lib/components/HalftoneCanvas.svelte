<script lang="ts">
  import { WebGpuShader } from 'svader';
  import shaderCode from '../shaders/halftone.wgsl?raw';
  import { bitmapToPackedRgba, loadImage } from '../utils/image';
  import type { HalftoneCanvasProps, SvaderParameter } from '../types/halftone';

  // Props con valores por defecto para DTF.
  let {
    src,
    lpi = 45,
    angle = 45,
    contrast = 1,
    dpi = 300,
    underbase = true,
    choke = 1,
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

  // Índices de binding compartidos con halftone.wgsl.
  const COLOR_MODE = 0;
  const UNDERBASE_MODE = 1;

  /**
   * Construye el array `parameters` de svader. La estructura (número y orden de
   * bindings) es siempre la misma; sólo cambian los valores. Eso es importante
   * porque svader crea los buffers al montar y después sólo actualiza su contenido.
   */
  function makeParameters(mode: number): SvaderParameter[] {
    const pixelData = pixels;
    if (!pixelData || imageWidth === 0 || imageHeight === 0) return [];

    const safeLpi = Math.max(1, lpi);
    const safeDpi = Math.max(1, dpi);
    const safeContrast = Math.max(0, contrast);
    const safeChoke = Math.min(2, Math.max(0, choke));

    return [
      { label: 'Resolución', binding: 0, value: 'resolution' },
      { label: 'LPI', binding: 1, value: new Float32Array([safeLpi]) },
      {
        label: 'Ángulo',
        binding: 2,
        value: new Float32Array([(angle * Math.PI) / 180]),
      },
      { label: 'Contraste', binding: 3, value: new Float32Array([safeContrast]) },
      { label: 'Choke', binding: 4, value: new Float32Array([safeChoke]) },
      {
        label: 'Underbase activo',
        binding: 5,
        value: new Float32Array([underbase ? 1 : 0]),
      },
      { label: 'Modo de pasada', binding: 6, value: new Float32Array([mode]) },
      {
        label: 'Tamaño de imagen',
        binding: 7,
        value: new Float32Array([imageWidth, imageHeight]),
      },
      { label: 'DPI de salida', binding: 8, value: new Float32Array([safeDpi]) },
      { label: 'Píxeles RGBA', binding: 9, value: pixelData, storage: true },
      { label: 'Offset', binding: 10, value: 'offset' },
    ];
  }

  // Dos pasadas con el mismo WGSL: color arriba y underbase debajo.
  const colorParameters = $derived.by(() => makeParameters(COLOR_MODE));
  const underbaseParameters = $derived.by(() => makeParameters(UNDERBASE_MODE));

  const aspectRatio = $derived(
    imageWidth > 0 && imageHeight > 0 ? `${imageWidth} / ${imageHeight}` : '1 / 1',
  );
</script>

<div class="halftone-canvas" style={`aspect-ratio: ${aspectRatio};`}>
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
      <!-- Capa inferior: underbase blanco erosionado (choke). -->
      <div class="layer underbase-layer" aria-hidden="true">
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
