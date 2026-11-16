<script lang="ts">
  import { onMount } from 'svelte';
  import {
    HalftoneCanvas,
    type HalftoneCanvasHandle,
    type HalftoneColorMode,
    type HalftoneDotShape,
    type HalftoneExportKind,
    type HalftoneExportResult,
    type HalftoneImageSource,
    type HalftonePreviewMode,
    type HalftonePreviewView,
    type HalftonePolarity,
    type HalftoneUnderbaseStyle,
  } from './lib';
  import { createDemoImage } from './lib/utils/demo-image';
  import { exportCalibrationSheet } from './lib/utils/calibration-export';
  import { exportCalibrationForRip } from './lib/utils/calibration-rip';
  import type { HalftoneExportOptions } from './lib/utils/export';
  import {
    HALFTONE_DEFAULTS,
    loadHalftoneSettings,
    saveHalftoneSettings,
    type HalftoneSettings,
  } from './lib/utils/settings';

  const FILE_ACCEPT = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';
  const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];
  const SHIRT_PRESETS = [
    { label: 'Negro', color: '#111111' },
    { label: 'Blanco', color: '#ffffff' },
    { label: 'Gris', color: '#808080' },
  ] as const;
  const EXPORT_LABELS: Record<HalftoneExportKind, string> = {
    color: 'separación de color',
    underbase: 'base blanca',
    composite: 'composite sobre camiseta',
  };
  const DOT_SHAPE_LABELS: Record<HalftoneDotShape, string> = {
    circle: 'Círculo',
    ellipse: 'Elipse',
    diamond: 'Diamante',
    square: 'Cuadrado',
    line: 'Línea',
  };

  // Parámetros reactivos del motor, restaurados del último ajuste guardado.
  const initialSettings = loadHalftoneSettings();
  let lpi = $state(initialSettings.lpi);
  let angle = $state(initialSettings.angle);
  let contrast = $state(initialSettings.contrast);
  let gamma = $state(initialSettings.gamma);
  let minDot = $state(initialSettings.minDot);
  let shadowPoint = $state(initialSettings.shadowPoint);
  let dotShape = $state<HalftoneDotShape>(initialSettings.dotShape);
  let dpi = $state(initialSettings.dpi);
  const cellPitch = $derived(dpi / Math.max(lpi, 1));
  let underbase = $state(initialSettings.underbase);
  let choke = $state(initialSettings.choke);
  let colorMode = $state<HalftoneColorMode>(initialSettings.colorMode);
  let polarity = $state<HalftonePolarity>(initialSettings.polarity);
  let blackPoint = $state(initialSettings.blackPoint);
  let whitePoint = $state(initialSettings.whitePoint);
  const safeWhitePoint = $derived(
    Math.min(1, Math.max(0.1, whitePoint, blackPoint + 0.01)),
  );

  // Mantiene el blanco por encima del negro cuando se sube el black point.
  $effect(() => {
    const minWhite = Math.max(0.1, blackPoint + 0.01);
    if (whitePoint < minWhite) whitePoint = minWhite;
  });

  // Guarda los ajustes en este navegador con un pequeño debounce para no
  // escribir en cada evento del slider.
  $effect(() => {
    const settings: HalftoneSettings = {
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
      underbaseStyle,
      colorMode,
      polarity,
      blackPoint,
      whitePoint,
      showUnderbase,
      shirtColor,
    };
    const handle = setTimeout(() => saveHalftoneSettings(settings), 250);
    return () => clearTimeout(handle);
  });

  // Preview y exportación.
  let shirtColor = $state(initialSettings.shirtColor);
  let customShirtColor = $state(initialSettings.shirtColor);
  let showUnderbase = $state(initialSettings.showUnderbase);
  let underbaseStyle = $state<HalftoneUnderbaseStyle>(initialSettings.underbaseStyle);
  let previewMode = $state<HalftonePreviewMode>('fit');
  let previewView = $state<HalftonePreviewView>('result');
  let exportReady = $state(false);
  let exporting = $state<HalftoneExportKind | null>(null);
  let calibrating = $state(false);
  let preparingRip = $state(false);
  let lastExportTiming = $state<{ label: string; ms: number } | null>(null);
  let exportMessage = $state<string | null>(null);
  let exportWarning = $state<string | null>(null);
  let exportError = $state<string | null>(null);
  let canvasRef = $state<HalftoneCanvasHandle | null>(null);

  const exportSummary = $derived(
    `Ajustes: ${colorMode === 'color' ? 'Color Original' : 'Monocromo'} · ${
      polarity === 'light' ? 'Luces imprimen' : 'Sombras imprimen'
    } · ${lpi} LPI · ${angle}° · ${DOT_SHAPE_LABELS[dotShape]} · ${dpi} DPI. ` +
      (underbase
        ? `Blanco/Composite: base ${
            underbaseStyle === 'solid' ? 'sólida' : 'tramada'
          } y choke ${choke} px.`
        : 'Underbase desactivado: solo hay capa Color.') +
      ' La capa Color nunca incluye base ni choke.',
  );

  // La fuente puede ser la demo generada o un archivo local.
  let source = $state<HalftoneImageSource | null>(null);
  let demoBitmap = $state<ImageBitmap | null>(null);
  let selectedName = $state('Demo generada');
  let error = $state<string | null>(null);
  let fileError = $state<string | null>(null);
  let isDragging = $state(false);
  let fileInput: HTMLInputElement | null = null;

  onMount(() => {
    let disposed = false;

    createDemoImage(1024)
      .then((bitmap) => {
        if (disposed) {
          bitmap.close();
          return;
        }

        demoBitmap = bitmap;
        // No pisa un archivo elegido mientras se generaba la demo.
        if (!source) source = bitmap;
      })
      .catch((cause) => {
        if (!disposed && !source) {
          error = cause instanceof Error ? cause.message : 'No se pudo generar la imagen de prueba.';
        }
      });

    return () => {
      disposed = true;
      demoBitmap?.close();
    };
  });

  function openFilePicker() {
    fileInput?.click();
  }

  function useDemo() {
    if (!demoBitmap) return;

    fileError = null;
    exportMessage = null;
    exportError = null;
    exportReady = false;
    selectedName = 'Demo generada';
    source = demoBitmap;
  }

  function isSupportedFile(file: File): boolean {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    return (
      SUPPORTED_MIME_TYPES.includes(file.type.toLowerCase()) ||
      SUPPORTED_EXTENSIONS.includes(extension)
    );
  }

  function selectFile(file: File | undefined) {
    fileError = null;
    exportMessage = null;
    exportError = null;
    if (!file) return;

    if (file.size === 0) {
      fileError = 'El archivo está vacío.';
      return;
    }

    if (!isSupportedFile(file)) {
      fileError = 'Formato no compatible. Usa PNG, JPG o WebP.';
      return;
    }

    exportReady = false;
    selectedName = file.name;
    source = file;
  }

  function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    selectFile(input.files?.[0]);
    // Permite volver a seleccionar el mismo archivo.
    input.value = '';
  }

  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  function handleDragLeave(event: DragEvent) {
    const container = event.currentTarget as HTMLElement;
    if (!container.contains(event.relatedTarget as Node | null)) {
      isDragging = false;
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    selectFile(event.dataTransfer?.files[0]);
  }

  function setShirtColor(color: string) {
    shirtColor = color;
    customShirtColor = color;
  }

  function handleCustomColor(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    customShirtColor = input.value;
    setShirtColor(input.value);
  }

  function handlePercentInput(
    event: Event,
    apply: (value: number) => void,
    max: number,
    min = 0,
  ) {
    const input = event.currentTarget as HTMLInputElement;
    const value = Number(input.value);
    if (!Number.isFinite(value)) return;
    apply(Math.min(max, Math.max(min, value / 100)));
  }

  // Al salir del campo numérico, deja el valor dentro del mismo rango que el
  // slider para que preview, exportación y ajustes guardados coincidan.
  function clampNumberInput(
    event: Event,
    apply: (value: number) => void,
    min: number,
    max: number,
    fallback: number,
  ) {
    const input = event.currentTarget as HTMLInputElement;
    const value = Number(input.value);
    apply(Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback);
  }

  function resetEngine() {
    lpi = HALFTONE_DEFAULTS.lpi;
    angle = HALFTONE_DEFAULTS.angle;
    contrast = HALFTONE_DEFAULTS.contrast;
    gamma = HALFTONE_DEFAULTS.gamma;
    minDot = HALFTONE_DEFAULTS.minDot;
    shadowPoint = HALFTONE_DEFAULTS.shadowPoint;
    dotShape = HALFTONE_DEFAULTS.dotShape;
    dpi = HALFTONE_DEFAULTS.dpi;
    underbase = HALFTONE_DEFAULTS.underbase;
    choke = HALFTONE_DEFAULTS.choke;
    underbaseStyle = HALFTONE_DEFAULTS.underbaseStyle;
    showUnderbase = HALFTONE_DEFAULTS.showUnderbase;
    colorMode = HALFTONE_DEFAULTS.colorMode;
    polarity = HALFTONE_DEFAULTS.polarity;
    blackPoint = HALFTONE_DEFAULTS.blackPoint;
    whitePoint = HALFTONE_DEFAULTS.whitePoint;
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function reductionWarning(result: HalftoneExportResult): string | null {
    if (!result.downscaled) return null;
    const effective =
      result.effectiveDpi !== undefined ? Math.round(result.effectiveDpi) : null;
    return (
      `La GPU redujo la salida a ${result.width} × ${result.height} px` +
      (effective !== null ? ` (${effective} DPI efectivos)` : '') +
      '. Se conservaron el tamaño físico y el LPI; hay menos detalle por pulgada.'
    );
  }

  async function downloadPng(kind: HalftoneExportKind) {
    if (!canvasRef) {
      exportError = 'La vista previa aún no está lista para exportar.';
      return;
    }

    exporting = kind;
    exportMessage = null;
    exportError = null;
    exportWarning = null;
    lastExportTiming = null;

    const startedAt = performance.now();
    try {
      const result = await canvasRef.exportPng(kind);
      downloadBlob(result.blob, result.filename);
      const ms = result.durationMs ?? performance.now() - startedAt;
      lastExportTiming = { label: EXPORT_LABELS[kind], ms };
      exportWarning = reductionWarning(result);
      exportMessage =
        `Descargado: ${result.filename} · ${result.width} × ${result.height} px · ` +
        `${Math.round(ms)} ms`;
    } catch (cause) {
      exportError =
        cause instanceof Error
          ? `No se pudo exportar: ${cause.message}`
          : 'No se pudo generar la exportación.';
    } finally {
      exporting = null;
    }
  }

  function currentExportOptions(): HalftoneExportOptions {
    return {
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
      underbaseStyle,
      colorMode,
      polarity,
      blackPoint,
      whitePoint: safeWhitePoint,
      shirtColor,
    };
  }

  async function downloadCalibration() {
    if (calibrating) return;

    calibrating = true;
    exportMessage = null;
    exportError = null;
    exportWarning = null;
    lastExportTiming = null;

    const startedAt = performance.now();
    try {
      const result = await exportCalibrationSheet(currentExportOptions());
      downloadBlob(result.blob, result.filename);
      const ms = result.durationMs ?? performance.now() - startedAt;
      lastExportTiming = { label: 'hoja de calibración', ms };
      exportWarning = reductionWarning(result);
      exportMessage =
        `Hoja de calibración: ${result.filename} · ${result.width} × ${result.height} px · ` +
        `${Math.round(ms)} ms`;
    } catch (cause) {
      exportError =
        cause instanceof Error
          ? `No se pudo generar la calibración: ${cause.message}`
          : 'No se pudo generar la hoja de calibración.';
    } finally {
      calibrating = false;
    }
  }

  async function downloadRipSheet() {
    if (preparingRip) return;

    preparingRip = true;
    exportMessage = null;
    exportError = null;
    exportWarning = null;
    lastExportTiming = null;

    const startedAt = performance.now();
    try {
      const result = await exportCalibrationForRip(currentExportOptions());
      downloadBlob(result.blob, result.filename);
      const ms = result.durationMs ?? performance.now() - startedAt;
      lastExportTiming = { label: 'hoja para RIP', ms };
      exportWarning = reductionWarning(result);
      exportMessage =
        `Hoja para RIP: ${result.filename} · ${result.width} × ${result.height} px · ` +
        `${Math.round(ms)} ms`;
    } catch (cause) {
      exportError =
        cause instanceof Error
          ? `No se pudo generar la hoja para RIP: ${cause.message}`
          : 'No se pudo generar la hoja para RIP.';
    } finally {
      preparingRip = false;
    }
  }
</script>

<svelte:head>
  <title>KromaStudio — DTF Halftone Lab</title>
  <meta
    name="description"
    content="Prototipo local-first de semitono B/N y underbase con choke para impresión DTF."
  />
</svelte:head>

<main class="app">
  <header class="hero">
    <p class="eyebrow">KromaStudio · WebGPU</p>
    <h1>DTF Halftone Lab</h1>
    <p class="lede">
      Semitono negro y underbase blanco con choke, renderizados en tiempo real
      con Svelte 5 y WebGPU.
    </p>
  </header>

  <section class="workspace">
    <div class="preview-panel">
      <div
        class="checkerboard"
        class:dragging={isDragging}
        class:actual={previewMode === 'actual'}
        style={`--shirt-color: ${shirtColor};`}
        role="region"
        aria-label="Vista previa y zona para soltar imágenes"
        ondragenter={handleDragEnter}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
      >
        {#if error && !source}
          <p class="load-error">{error}</p>
        {:else if source}
          <HalftoneCanvas
            bind:this={canvasRef}
            src={source}
            {lpi}
            {angle}
            {contrast}
            {gamma}
            {minDot}
            {shadowPoint}
            {dotShape}
            {dpi}
            {underbase}
            {choke}
            {underbaseStyle}
            {colorMode}
            {polarity}
            {blackPoint}
            whitePoint={safeWhitePoint}
            {shirtColor}
            {showUnderbase}
            {previewMode}
            {previewView}
            bind:exportReady
          />
        {:else}
          <p class="loading">Generando imagen de prueba…</p>
        {/if}

        {#if isDragging}
          <div class="drop-overlay">Suelta la imagen aquí</div>
        {/if}
      </div>
      <div class="preview-toolbar">
        <div class="toolbar-group" role="group" aria-label="Vista de la imagen">
          <span>Vista</span>
          <button
            type="button"
            class:active={previewView === 'result'}
            aria-pressed={previewView === 'result'}
            onclick={() => (previewView = 'result')}
          >
            Resultado
          </button>
          <button
            type="button"
            class:active={previewView === 'original'}
            aria-pressed={previewView === 'original'}
            onclick={() => (previewView = 'original')}
          >
            Original
          </button>
          <button
            type="button"
            class:active={previewView === 'compare'}
            aria-pressed={previewView === 'compare'}
            onclick={() => (previewView = 'compare')}
          >
            Comparar
          </button>
          <button
            type="button"
            class:active={previewView === 'mask'}
            aria-pressed={previewView === 'mask'}
            onclick={() => (previewView = 'mask')}
          >
            Máscara
          </button>
          <button
            type="button"
            class:active={previewView === 'underbase'}
            aria-pressed={previewView === 'underbase'}
            onclick={() => (previewView = 'underbase')}
          >
            Blanco
          </button>
        </div>

        <div class="toolbar-group scale-group" role="group" aria-label="Escala de la vista previa">
          <span>Escala</span>
          <button
            type="button"
            class:active={previewMode === 'fit'}
            aria-pressed={previewMode === 'fit'}
            onclick={() => (previewMode = 'fit')}
          >
            Ajustar
          </button>
          <button
            type="button"
            class:active={previewMode === 'actual'}
            aria-pressed={previewMode === 'actual'}
            onclick={() => (previewMode = 'actual')}
          >
            100 %
          </button>
        </div>
      </div>
      <p class="preview-note">
        El fondo simula la camiseta. El blanco es la capa de underbase; los
        puntos negros, la capa de color. Usa <strong>Comparar</strong> para
        superponer el original y el resultado con un divisor arrastrable, o
        cambia a las vistas de máscara y base blanca. También puedes arrastrar
        una imagen sobre la vista previa.
      </p>
    </div>

    <aside class="controls" aria-label="Parámetros de semitono y underbase">
      <div class="controls-head">
        <span>Ajustes</span>
        <button type="button" class="reset-button" onclick={resetEngine}>
          Restaurar
        </button>
      </div>

      <fieldset>
        <legend>Imagen</legend>

        <input
          bind:this={fileInput}
          type="file"
          accept={FILE_ACCEPT}
          onchange={handleFileChange}
          hidden
        />

        <div class="file-actions">
          <button type="button" onclick={openFilePicker}>Seleccionar imagen</button>
          <button type="button" class="secondary" onclick={useDemo} disabled={!demoBitmap}>
            Usar demo
          </button>
        </div>

        <p class="file-name" title={selectedName}>{selectedName}</p>
        {#if fileError}
          <p class="file-error" role="alert">{fileError}</p>
        {/if}
        <p class="hint">
          PNG, JPG o WebP. El archivo se procesa localmente y no se sube a ningún servidor.
        </p>
      </fieldset>

      <details class="control-group" open>
        <summary>Trama</summary>
        <div class="group-body">
          <label>
            <span>Forma de punto</span>
            <select bind:value={dotShape}>
              <option value="circle">Círculo</option>
              <option value="ellipse">Elipse</option>
              <option value="diamond">Diamante</option>
              <option value="square">Cuadrado</option>
              <option value="line">Línea</option>
            </select>
          </label>

          <label>
            <span>
              LPI
              <input
                class="number-input"
                type="number"
                min="10"
                max="120"
                step="1"
                bind:value={lpi}
                onchange={(event) =>
                  clampNumberInput(event, (value) => (lpi = value), 10, 120, HALFTONE_DEFAULTS.lpi)}
                aria-label="LPI exacto"
              />
            </span>
            <input type="range" min="10" max="120" step="1" bind:value={lpi} />
          </label>

          <div class="presets" role="group" aria-label="Presets de LPI">
            {#each [25, 35, 45] as value}
              <button
                type="button"
                class:active={lpi === value}
                onclick={() => (lpi = value)}
              >
                {value}
              </button>
            {/each}
          </div>

          <label>
            <span>
              Ángulo
              <input
                class="number-input"
                type="number"
                min="0"
                max="180"
                step="0.5"
                bind:value={angle}
                onchange={(event) =>
                  clampNumberInput(event, (value) => (angle = value), 0, 180, HALFTONE_DEFAULTS.angle)}
                aria-label="Ángulo exacto en grados"
              />
            </span>
            <input type="range" min="0" max="180" step="0.5" bind:value={angle} />
          </label>

          <div class="presets" role="group" aria-label="Presets de ángulo">
            {#each [22.5, 45] as value}
              <button
                type="button"
                class:active={angle === value}
                onclick={() => (angle = value)}
              >
                {value}°
              </button>
            {/each}
          </div>

          <label>
            <span>
              Contraste
              <input
                class="number-input"
                type="number"
                min="0.5"
                max="2.5"
                step="0.05"
                bind:value={contrast}
                onchange={(event) =>
                  clampNumberInput(event, (value) => (contrast = value), 0.5, 2.5, HALFTONE_DEFAULTS.contrast)}
                aria-label="Contraste exacto"
              />
            </span>
            <input type="range" min="0.5" max="2.5" step="0.05" bind:value={contrast} />
          </label>

          <label>
            <span>
              DPI de salida
              <input
                class="number-input"
                type="number"
                min="72"
                max="600"
                step="1"
                bind:value={dpi}
                onchange={(event) =>
                  clampNumberInput(event, (value) => (dpi = value), 72, 600, HALFTONE_DEFAULTS.dpi)}
                aria-label="DPI de salida exacto"
              />
            </span>
            <input type="range" min="72" max="600" step="1" bind:value={dpi} />
          </label>

          <p class="hint">Pitch lógico: {cellPitch.toFixed(2)} px por celda.</p>
          {#if cellPitch < 1}
            <p class="file-error" role="alert">
              Esta combinación no se puede exportar: necesita menos de un píxel por celda.
              Sube los DPI o baja los LPI.
            </p>
          {:else if cellPitch < 2}
            <p class="hint">
              La trama tiene menos de dos píxeles por celda; el preview mostrará cobertura
              media y la exportación puede perder definición.
            </p>
          {/if}
        </div>
      </details>

      <details class="control-group" open>
        <summary>Color y niveles</summary>
        <div class="group-body">
          <label>
            <span>Modo de color</span>
            <select bind:value={colorMode}>
              <option value="color">Color Original</option>
              <option value="mono">Blanco y Negro (Monocromo)</option>
            </select>
          </label>

          <label>
            <span>Polaridad tonal</span>
            <select bind:value={polarity}>
              <option value="light">Luces imprimen</option>
              <option value="dark">Sombras imprimen</option>
            </select>
          </label>

          <label>
            <span>
              Compensación tonal
              <input
                class="number-input"
                type="number"
                min="0.4"
                max="2.5"
                step="0.05"
                bind:value={gamma}
                onchange={(event) =>
                  clampNumberInput(event, (value) => (gamma = value), 0.4, 2.5, HALFTONE_DEFAULTS.gamma)}
                aria-label="Compensación tonal exacta"
              />
            </span>
            <input type="range" min="0.4" max="2.5" step="0.05" bind:value={gamma} />
          </label>

          <label>
            <span>
              Punto mínimo (%)
              <input
                class="number-input"
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={(minDot * 100).toFixed(1)}
                oninput={(event) => handlePercentInput(event, (value) => (minDot = value), 0.2)}
                aria-label="Punto mínimo en porcentaje"
              />
            </span>
            <input type="range" min="0" max="0.2" step="0.005" bind:value={minDot} />
          </label>

          <label>
            <span>
              Sombras sólidas (%)
              <input
                class="number-input"
                type="number"
                min="80"
                max="100"
                step="1"
                value={(shadowPoint * 100).toFixed(0)}
                oninput={(event) =>
                  handlePercentInput(event, (value) => (shadowPoint = value), 1, 0.8)}
                aria-label="Sombras sólidas en porcentaje"
              />
            </span>
            <input type="range" min="0.8" max="1" step="0.01" bind:value={shadowPoint} />
          </label>

          <label>
            <span>
              Nivel de Negro (%)
              <input
                class="number-input"
                type="number"
                min="0"
                max="90"
                step="1"
                value={(blackPoint * 100).toFixed(0)}
                oninput={(event) =>
                  handlePercentInput(event, (value) => (blackPoint = value), 0.9)}
                aria-label="Nivel de negro en porcentaje"
              />
            </span>
            <input
              type="range"
              min="0"
              max="0.9"
              step="0.01"
              bind:value={blackPoint}
            />
          </label>

          <label>
            <span>
              Nivel de Blanco (%)
              <input
                class="number-input"
                type="number"
                min={Math.max(1, (blackPoint + 0.01) * 100).toFixed(0)}
                max="100"
                step="1"
                value={(safeWhitePoint * 100).toFixed(0)}
                oninput={(event) =>
                  handlePercentInput(
                    event,
                    (value) => (whitePoint = value),
                    1,
                    Math.max(0.1, blackPoint + 0.01),
                  )}
                aria-label="Nivel de blanco en porcentaje"
              />
            </span>
            <input
              type="range"
              min={Math.max(0.1, blackPoint + 0.01).toFixed(2)}
              max="1"
              step="0.01"
              bind:value={whitePoint}
            />
          </label>

          <p class="hint">
            La compensación tonal ajusta el área de los puntos; por encima de 1 reduce
            los tonos medios. El punto mínimo descarta luces débiles y las sombras
            sólidas definen el salto a cobertura completa. El nivel de negro recorta
            el fondo oscuro. La polaridad decide si la tinta corresponde a las luces
            (referencia Photoshop) o a las sombras.
          </p>
        </div>
      </details>

      <details class="control-group" open>
        <summary>Underbase</summary>
        <div class="group-body">
          <label class="switch">
            <input type="checkbox" bind:checked={underbase} />
            <span>Underbase activo</span>
          </label>

          <label>
            <span>Tipo de base</span>
            <select bind:value={underbaseStyle} disabled={!underbase}>
              <option value="dot">Tramada (puntos)</option>
              <option value="solid">Sólida</option>
            </select>
          </label>

          <label class="switch">
            <input type="checkbox" bind:checked={showUnderbase} disabled={!underbase} />
            <span>Mostrar underbase en el resultado</span>
          </label>

          <label>
            <span>
              Choke (px)
              <input
                class="number-input"
                type="number"
                min="0"
                max="3"
                step="0.5"
                bind:value={choke}
                onchange={(event) =>
                  clampNumberInput(event, (value) => (choke = value), 0, 3, HALFTONE_DEFAULTS.choke)}
                disabled={!underbase}
                aria-label="Choke exacto en píxeles"
              />
            </span>
            <input
              type="range"
              min="0"
              max="3"
              step="0.5"
              bind:value={choke}
              disabled={!underbase}
            />
          </label>

          <p class="hint">
            El underbase solo se genera bajo tinta visible y se erosiona con el
            choke para que el blanco no asome en los bordes del diseño. La base
            tramada replica los puntos de color; la sólida cubre toda el área
            imprimible. Valida cuál acepta mejor tu RIP.
          </p>
        </div>
      </details>

      <details class="control-group" open>
        <summary>Camiseta</summary>
        <div class="group-body">
          <div class="shirt-presets" role="group" aria-label="Color de camiseta">
            {#each SHIRT_PRESETS as preset}
              <button
                type="button"
                class="shirt-swatch"
                class:active={shirtColor === preset.color}
                style={`--swatch: ${preset.color};`}
                aria-pressed={shirtColor === preset.color}
                onclick={() => setShirtColor(preset.color)}
              >
                <span class="swatch-dot"></span>
                {preset.label}
              </button>
            {/each}
          </div>

          <label class="color-picker">
            <span>Color personalizado</span>
            <input
              type="color"
              value={customShirtColor}
              oninput={handleCustomColor}
            />
          </label>
        </div>
      </details>

      <fieldset>
        <legend>Exportar PNG</legend>

        <p class="export-summary">{exportSummary}</p>

        <div class="export-actions">
          <button
            type="button"
            onclick={() => downloadPng('color')}
            disabled={!source || !exportReady || exporting !== null || calibrating || preparingRip || cellPitch < 1}
          >
            {exporting === 'color' ? 'Procesando…' : 'Color (separación)'}
          </button>
          <button
            type="button"
            class="secondary"
            onclick={() => downloadPng('underbase')}
            disabled={!source || !exportReady || !underbase || exporting !== null || calibrating || preparingRip || cellPitch < 1}
          >
            {exporting === 'underbase' ? 'Procesando…' : 'Base blanca'}
          </button>
          <button
            type="button"
            class="secondary"
            onclick={() => downloadPng('composite')}
            disabled={!source || !exportReady || exporting !== null || calibrating || preparingRip || cellPitch < 1}
          >
            {exporting === 'composite' ? 'Procesando…' : 'Composite'}
          </button>
          <button
            type="button"
            class="secondary"
            onclick={downloadCalibration}
            disabled={calibrating || preparingRip || exporting !== null || cellPitch < 1}
          >
            {calibrating ? 'Generando hoja…' : 'Hoja de calibración'}
          </button>
          <button
            type="button"
            class="secondary"
            onclick={downloadRipSheet}
            disabled={preparingRip || calibrating || exporting !== null || cellPitch < 1}
          >
            {preparingRip ? 'Generando RIP…' : 'Hoja para RIP'}
          </button>
        </div>

        {#if lastExportTiming}
          <p class="export-timing" role="status">
            Tiempo de la última exportación ({lastExportTiming.label}):
            <strong>{Math.round(lastExportTiming.ms)} ms</strong>
          </p>
        {/if}

        {#if exportWarning}
          <p class="export-warning" role="status">{exportWarning}</p>
        {/if}

        {#if calibrating}
          <p class="export-status" role="status">
            <span class="spinner" aria-hidden="true"></span>
            Generando hoja de calibración…
          </p>
        {/if}

        {#if preparingRip}
          <p class="export-status" role="status">
            <span class="spinner" aria-hidden="true"></span>
            Generando hoja transparente para RIP…
          </p>
        {/if}

        {#if exporting}
          <p class="export-status" role="status">
            <span class="spinner" aria-hidden="true"></span>
            Procesando {EXPORT_LABELS[exporting]}…
          </p>
        {/if}

        {#if exportMessage}
          <p class="export-success" role="status">{exportMessage}</p>
        {/if}

        {#if exportError}
          <p class="file-error" role="alert">{exportError}</p>
        {/if}

        <p class="hint">
          <strong>Color</strong> es la separación de tinta: no incluye blanco ni
          choke. <strong>Base blanca</strong> aplica el tipo de base y el choke
          configurados. <strong>Composite</strong> combina ambos sobre el color
          de camiseta. Los PNG salen con transparencia y a la resolución de la
          imagen.
        </p>
        <p class="hint">
          La hoja de calibración reúne Color, Base blanca y Composite con los
          ajustes actuales; sus etiquetas se añaden después del semitono.
        </p>
        <p class="hint">
          <strong>Hoja para RIP</strong> es una sola placa de color transparente
          de 4 × 5,33″. No incluye fondos ni base blanca: el RIP la genera desde
          el alfa.
        </p>
      </fieldset>

      <div class="badge">local-first · sin subir archivos</div>
    </aside>
  </section>
</main>

<style>
  .app {
    width: min(1180px, 100%);
    margin: 0 auto;
    padding: clamp(1.25rem, 4vw, 3rem);
  }

  .hero {
    max-width: 760px;
    margin-bottom: clamp(1.5rem, 4vw, 3rem);
  }

  .eyebrow {
    margin: 0 0 0.65rem;
    font: 600 0.78rem/1.2 ui-monospace, monospace;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #f0b45f;
  }

  h1 {
    margin: 0;
    font: 700 clamp(2.4rem, 7vw, 5.2rem) / 0.95 system-ui, sans-serif;
    letter-spacing: -0.055em;
    color: #f5f0e8;
  }

  .lede {
    max-width: 58ch;
    margin: 1rem 0 0;
    font: 1rem/1.55 system-ui, sans-serif;
    color: #a8a29a;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: clamp(1.25rem, 3vw, 2.5rem);
    align-items: start;
  }

  .preview-panel {
    min-width: 0;
  }

  .checkerboard {
    position: relative;
    width: 100%;
    border: 1px solid #2a2c33;
    border-radius: 18px;
    overflow: hidden;
    background-color: var(--shirt-color, #15171c);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
  }

  .checkerboard.dragging {
    border-color: #f0b45f;
  }

  .checkerboard.actual {
    max-height: 80vh;
    overflow: auto;
    overscroll-behavior: contain;
  }

  .drop-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: grid;
    place-items: center;
    border: 2px dashed #f0b45f;
    border-radius: 18px;
    background: rgba(10, 11, 14, 0.82);
    color: #f5f0e8;
    font: 600 1rem/1.4 system-ui, sans-serif;
    pointer-events: none;
  }

  .loading,
  .load-error {
    display: grid;
    place-items: center;
    min-height: 420px;
    margin: 0;
    padding: 2rem;
    text-align: center;
    font: 0.95rem/1.5 system-ui, sans-serif;
    color: #a8a29a;
  }

  .load-error {
    color: #ffb4a8;
  }

  .preview-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.75rem;
    margin-top: 0.75rem;
    font: 0.78rem/1.3 ui-monospace, monospace;
    color: #7f7a73;
  }

  .toolbar-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem;
    min-width: 0;
  }

  .toolbar-group.scale-group {
    margin-left: auto;
  }

  .preview-toolbar span {
    color: inherit;
  }

  .preview-toolbar button {
    padding: 0.4rem 0.65rem;
    border: 1px solid #2a2c33;
    border-radius: 7px;
    background: #14161b;
    color: #a8a29a;
    font: inherit;
    white-space: nowrap;
    cursor: pointer;
  }

  .preview-toolbar button.active {
    border-color: #f0b45f;
    color: #f0b45f;
  }

  .preview-toolbar button:focus-visible {
    outline: 2px solid #f0b45f;
    outline-offset: 2px;
  }

  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .presets button {
    padding: 0.25rem 0.6rem;
    border: 1px solid #2a2c33;
    border-radius: 6px;
    background: #14161b;
    color: #a8a29a;
    font: 0.72rem/1.3 ui-monospace, monospace;
    cursor: pointer;
  }

  .presets button.active {
    border-color: #f0b45f;
    color: #f0b45f;
  }

  .presets button:focus-visible {
    outline: 2px solid #f0b45f;
    outline-offset: 2px;
  }

  .preview-note {
    margin: 0.9rem 0 0;
    font: 0.82rem/1.5 system-ui, sans-serif;
    color: #7f7a73;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.25rem;
    border: 1px solid #2a2c33;
    border-radius: 18px;
    background: linear-gradient(180deg, #14161b, #101216);
  }

  .controls-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    font: 600 0.78rem/1.2 ui-monospace, monospace;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #f0b45f;
  }

  .reset-button {
    padding: 0.3rem 0.55rem;
    border: 1px solid #2a2c33;
    border-radius: 7px;
    background: transparent;
    color: #a8a29a;
    font: 0.72rem/1.2 ui-monospace, monospace;
    letter-spacing: 0;
    text-transform: none;
    cursor: pointer;
  }

  .reset-button:hover {
    border-color: #f0b45f;
    color: #f0b45f;
  }

  .reset-button:focus-visible {
    outline: 2px solid #f0b45f;
    outline-offset: 2px;
  }

  .control-group {
    padding: 0 0 0.85rem;
    border-bottom: 1px solid #24262d;
  }

  .control-group > summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0;
    font: 600 0.78rem/1.2 ui-monospace, monospace;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #f0b45f;
    list-style: none;
    cursor: pointer;
  }

  .control-group > summary::-webkit-details-marker {
    display: none;
  }

  .control-group > summary::after {
    content: '▾';
    font-size: 0.9rem;
    transition: transform 0.15s ease;
  }

  .control-group:not([open]) > summary::after {
    transform: rotate(-90deg);
  }

  .control-group[open] > summary {
    margin-bottom: 0.85rem;
  }

  .control-group > summary:focus-visible {
    outline: 2px solid #f0b45f;
    outline-offset: 2px;
  }

  .group-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  fieldset {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin: 0;
    padding: 0 0 1rem;
    border: 0;
    border-bottom: 1px solid #24262d;
  }

  fieldset:last-of-type {
    padding-bottom: 0;
    border-bottom: 0;
  }

  legend {
    padding: 0;
    margin-bottom: 0.85rem;
    font: 600 0.78rem/1.2 ui-monospace, monospace;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #f0b45f;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    font: 0.88rem/1.3 system-ui, sans-serif;
    color: #d7d1c7;
  }

  label > span {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .number-input {
    width: 4.75rem;
    padding: 0.25rem 0.4rem;
    border: 1px solid #2a2c33;
    border-radius: 6px;
    background: #0f1115;
    color: #f5f0e8;
    font: 0.78rem/1.2 ui-monospace, monospace;
    text-align: right;
  }

  .number-input:focus-visible {
    outline: 2px solid #f0b45f;
    outline-offset: 2px;
  }

  .number-input:disabled {
    opacity: 0.4;
  }

  input[type='range'] {
    width: 100%;
    accent-color: #f0b45f;
  }

  input[type='range']:disabled {
    opacity: 0.35;
  }

  select {
    width: 100%;
    padding: 0.55rem 0.65rem;
    border: 1px solid #2a2c33;
    border-radius: 8px;
    background: #0f1115;
    color: #f5f0e8;
    font: 0.85rem/1.2 system-ui, sans-serif;
    cursor: pointer;
  }

  select:focus-visible {
    outline: 2px solid #f0b45f;
    outline-offset: 2px;
  }

  .switch {
    flex-direction: row;
    align-items: center;
    gap: 0.65rem;
  }

  .switch input {
    width: 1rem;
    height: 1rem;
    accent-color: #f0b45f;
  }

  .switch input:disabled {
    opacity: 0.4;
  }

  .file-actions,
  .export-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .export-actions {
    flex-direction: column;
    flex-wrap: nowrap;
  }

  .file-actions button,
  .export-actions button {
    flex: 1 1 120px;
    padding: 0.65rem 0.75rem;
    border: 1px solid #f0b45f;
    border-radius: 10px;
    background: #f0b45f;
    color: #18110a;
    font: 600 0.82rem/1.2 system-ui, sans-serif;
    cursor: pointer;
  }

  .export-actions button {
    flex: none;
    width: 100%;
  }

  .file-actions button.secondary,
  .export-actions button.secondary {
    border-color: #4a3b28;
    background: transparent;
    color: #f0b45f;
  }

  .file-actions button:hover:not(:disabled),
  .export-actions button:hover:not(:disabled) {
    filter: brightness(1.08);
  }

  .file-actions button:focus-visible,
  .export-actions button:focus-visible,
  .shirt-swatch:focus-visible {
    outline: 2px solid #f0b45f;
    outline-offset: 2px;
  }

  .file-actions button:disabled,
  .export-actions button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .shirt-presets {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .shirt-swatch {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.55rem 0.4rem;
    border: 1px solid #2a2c33;
    border-radius: 9px;
    background: #0f1115;
    color: #d7d1c7;
    font: 0.78rem/1.2 system-ui, sans-serif;
    cursor: pointer;
  }

  .shirt-swatch.active {
    border-color: #f0b45f;
    box-shadow: inset 0 0 0 1px #f0b45f;
    color: #f5f0e8;
  }

  .swatch-dot {
    width: 0.9rem;
    height: 0.9rem;
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: 50%;
    background: var(--swatch);
  }

  .color-picker {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .color-picker input[type='color'] {
    width: 2.6rem;
    height: 1.9rem;
    padding: 0;
    border: 1px solid #2a2c33;
    border-radius: 7px;
    background: transparent;
    cursor: pointer;
  }

  .export-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font: 0.8rem/1.4 system-ui, sans-serif;
    color: #f0b45f;
  }

  .export-summary {
    margin: 0;
    padding: 0.55rem 0.65rem;
    border: 1px solid #24262d;
    border-radius: 8px;
    background: #0f1115;
    font: 0.74rem/1.5 ui-monospace, monospace;
    color: #b8b2a8;
  }

  .export-timing {
    margin: 0;
    padding: 0.45rem 0.6rem;
    border: 1px solid #3b3325;
    border-radius: 8px;
    background: #17130d;
    font: 0.76rem/1.4 ui-monospace, monospace;
    color: #f0b45f;
  }

  .export-timing strong {
    color: #f5f0e8;
    font-weight: 600;
  }

  .export-warning {
    margin: 0;
    padding: 0.5rem 0.6rem;
    border: 1px solid #6b4c25;
    border-radius: 8px;
    background: #221a10;
    font: 0.76rem/1.45 system-ui, sans-serif;
    color: #f0b45f;
  }

  .spinner {
    width: 0.9rem;
    height: 0.9rem;
    border: 2px solid rgba(240, 180, 95, 0.25);
    border-top-color: #f0b45f;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .export-success {
    margin: 0;
    font: 0.78rem/1.4 system-ui, sans-serif;
    color: #9bd6a3;
    overflow-wrap: anywhere;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .file-name {
    overflow: hidden;
    margin: 0;
    font: 0.78rem/1.4 ui-monospace, monospace;
    color: #d7d1c7;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-error {
    margin: 0;
    font: 0.8rem/1.4 system-ui, sans-serif;
    color: #ffb4a8;
  }

  .hint {
    margin: 0;
    font: 0.78rem/1.5 system-ui, sans-serif;
    color: #7f7a73;
  }

  .badge {
    align-self: flex-start;
    padding: 0.35rem 0.6rem;
    border: 1px solid #2a2c33;
    border-radius: 999px;
    font: 0.7rem/1 ui-monospace, monospace;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #7f7a73;
  }

  @media (max-width: 880px) {
    .workspace {
      grid-template-columns: 1fr;
    }

    .toolbar-group.scale-group {
      margin-left: 0;
    }
  }

  @media (max-width: 560px) {
    .toolbar-group {
      width: 100%;
    }

    .toolbar-group button {
      flex: 1 1 auto;
    }
  }
</style>
