<script lang="ts">
  import { buildPreflightWarnings, preflightSummary } from '../../utils/preflight';
  import { clampNumberInput, rangeProgressPercent } from '../../utils/inputs';
import { HALFTONE_DEFAULTS } from '../../utils/settings';
import { validateEnumParameter } from '../../utils/parameter-registry';
  import type { DocumentState } from '../../state/document.svelte';
  import type { EditorState } from '../../state/editor.svelte';
  import type { ExportState } from '../../state/export.svelte';

  interface Props {
    editor: EditorState;
    doc: DocumentState;
    exporter: ExportState;
  }

  let { editor, doc, exporter }: Props = $props();

  const DOT_SHAPE_LABELS = {
    circle: 'Círculo',
    ellipse: 'Elipse',
    diamond: 'Diamante',
    square: 'Cuadrado',
    line: 'Línea',
  } as const;

  const MODE_LABELS = {
    fades: 'Fades Only',
    knockout: 'Knockout Shirt',
    full: 'Full Halftone',
  } as const;

  const exportSummary = $derived(
    `${MODE_LABELS[editor.applicationMode]} · ${editor.colorMode === 'color' ? 'Color original' : 'Monocromo'} · ${
      editor.polarity === 'light' ? 'Luces imprimen' : 'Sombras imprimen'
    } · ${editor.lpi} LPI · ${editor.angle}° · ${DOT_SHAPE_LABELS[editor.dotShape]} · ${
      editor.dpi
    } DPI · brillo ${editor.brightness} · contraste ${editor.contrast} · gamma ${editor.gamma} · niveles ${editor.blackPoint}/${editor.safeWhitePoint}. ` +
      (editor.underbase
        ? `Blanco/Composite: base ${
            editor.underbaseStyle === 'solid' ? 'sólida' : 'tramada'
          }, choke ${editor.choke} px y spread ${editor.spread} px.`
        : 'Underbase desactivado: solo hay capa Color.') +
      ' La capa Color no incorpora la base blanca.',
  );

  const busy = $derived(
    exporter.exporting !== null || exporter.calibrating || exporter.preparingRip,
  );

  const unitScale = $derived(exporter.sizeUnit === 'cm' ? 2.54 : 1);
  const sourceAspect = $derived(
    doc.imageStats ? doc.imageStats.width / Math.max(1, doc.imageStats.height) : 1,
  );
  const widthIn = $derived(
    exporter.physicalWidthIn ?? (doc.imageStats ? doc.imageStats.width / editor.dpi : null),
  );
  const heightIn = $derived(
    exporter.physicalHeightIn ?? (doc.imageStats ? doc.imageStats.height / editor.dpi : null),
  );
  const outputPixels = $derived(
    widthIn !== null && heightIn !== null
      ? `${Math.round(widthIn * editor.dpi)} × ${Math.round(heightIn * editor.dpi)} px`
      : '—',
  );
  const preflightImage = $derived(
    doc.imageStats && widthIn !== null && heightIn !== null
      ? preflightSummary(doc.imageStats, editor.dpi, widthIn, heightIn)
      : null,
  );
  const preflightWarnings = $derived(
    doc.imageStats ? buildPreflightWarnings(doc.imageStats, editor.polarity) : [],
  );

  function parsePhysicalInput(event: Event): number | null {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    if (!Number.isFinite(value) || value <= 0) return null;
    return Math.min(1000, Math.max(0.1, value)) / unitScale;
  }

  function handleWidthInput(event: Event): void {
    const nextWidth = parsePhysicalInput(event);
    if (nextWidth === null) return;
    exporter.physicalWidthIn = nextWidth;
    if (exporter.keepAspect) exporter.physicalHeightIn = nextWidth / sourceAspect;
  }

  function handleHeightInput(event: Event): void {
    const nextHeight = parsePhysicalInput(event);
    if (nextHeight === null) return;
    exporter.physicalHeightIn = nextHeight;
    if (exporter.keepAspect) exporter.physicalWidthIn = nextHeight * sourceAspect;
  }

  function handleAspectChange(event: Event): void {
    exporter.keepAspect = (event.currentTarget as HTMLInputElement).checked;
    if (exporter.keepAspect && widthIn !== null) {
      exporter.physicalWidthIn = widthIn;
      exporter.physicalHeightIn = widthIn / sourceAspect;
    }
  }

  function resetOutputSize(): void {
    exporter.physicalWidthIn = null;
    exporter.physicalHeightIn = null;
  }

  function handleUnitChange(event: Event): void {
    exporter.sizeUnit = validateEnumParameter(
      'outputUnit',
      (event.currentTarget as HTMLSelectElement).value,
    );
  }
</script>

<div class="panel">
  <details class="group" id="panel-exportacion" open>
    <summary class="group-title">Exportación <span class="chevron" aria-hidden="true"></span></summary>

    <div class="subsection">
      <div class="subsection-head">
        <div>
          <h3>Tamaño físico</h3>
          <p class="hint">La salida se rasteriza a DPI × tamaño físico.</p>
        </div>
        <button type="button" class="reset-size" onclick={resetOutputSize} disabled={!doc.imageStats}>
          Tamaño fuente
        </button>
      </div>

      <label class="field">
        <span>Ancho ({exporter.sizeUnit})</span>
        <input
          type="number"
          min="0.1"
          max="1000"
          step="0.01"
          value={widthIn === null ? '' : (widthIn * unitScale).toFixed(2)}
          oninput={handleWidthInput}
          disabled={!doc.imageStats}
          aria-label={`Ancho físico de salida en ${exporter.sizeUnit}`}
        />
      </label>
      <label class="field">
        <span>Alto ({exporter.sizeUnit})</span>
        <input
          type="number"
          min="0.1"
          max="1000"
          step="0.01"
          value={heightIn === null ? '' : (heightIn * unitScale).toFixed(2)}
          oninput={handleHeightInput}
          disabled={!doc.imageStats}
          aria-label={`Alto físico de salida en ${exporter.sizeUnit}`}
        />
      </label>

      <div class="output-options">
        <label class="select-field">
          <span>Unidades</span>
          <select value={exporter.sizeUnit} onchange={handleUnitChange}>
            <option value="in">Pulgadas</option>
            <option value="cm">Centímetros</option>
          </select>
        </label>
        <label class="switch">
          <input type="checkbox" checked={exporter.keepAspect} onchange={handleAspectChange} />
          <span>Mantener proporción</span>
        </label>
      </div>
      <p class="output-pixels"><span>Píxeles de salida</span><strong>{outputPixels}</strong></p>
    </div>

    <div class="field">
      <div class="field-head">
        <label for="output-dpi-range">DPI de salida</label>
        <input
          id="output-dpi-number"
          class="number-input"
          type="number"
          min="72"
          max="600"
          step="1"
          bind:value={editor.dpi}
          onchange={(event) =>
            clampNumberInput(event, (value) => (editor.dpi = value), 72, 600, HALFTONE_DEFAULTS.dpi)}
          aria-label="DPI de salida exactos"
        />
      </div>
      <input
        id="output-dpi-range"
        class="range-control"
        type="range"
        min="72"
        max="600"
        step="1"
        bind:value={editor.dpi}
        aria-valuetext={`${editor.dpi} DPI`}
        style={`--range-progress: ${rangeProgressPercent(editor.dpi, 72, 600)}%;`}
      />
      <p class="hint">Resolución configurada para las separaciones PNG.</p>
    </div>

    <div class="output-options">
      <label class="switch">
        <input type="checkbox" bind:checked={exporter.mirror} />
        <span>Espejo horizontal al exportar</span>
      </label>
      <p class="format-note"><strong>PNG RGBA</strong><span>Color y base blanca conservan alfa; composite usa la simulación de camiseta.</span></p>
    </div>

    <p class="summary">{exportSummary}</p>

    {#if preflightImage}
      <div class="preflight">
        <p class="preflight-summary">{preflightImage}</p>
        {#each preflightWarnings as warning}
          <p class={`preflight-note ${warning.level}`}>{warning.text}</p>
        {/each}
      </div>
    {/if}

    <div class="actions">
      <button
        type="button"
        class="primary"
        onclick={() => exporter.downloadPng('color')}
        disabled={!doc.hasDocument || !doc.exportReady || busy || editor.cellPitch < 1}
      >
        {exporter.exporting === 'color' ? 'Procesando…' : 'Color (separación)'}
      </button>
      <button
        type="button"
        class="ghost"
        onclick={() => exporter.downloadPng('underbase')}
        disabled={!doc.hasDocument || !doc.exportReady || !editor.underbase || busy || editor.cellPitch < 1}
      >
        {exporter.exporting === 'underbase' ? 'Procesando…' : 'Base blanca'}
      </button>
      <button
        type="button"
        class="ghost"
        onclick={() => exporter.downloadPng('composite')}
        disabled={!doc.hasDocument || !doc.exportReady || busy || editor.cellPitch < 1}
      >
        {exporter.exporting === 'composite' ? 'Procesando…' : 'Composite'}
      </button>
      <button
        type="button"
        class="ghost"
        onclick={() => exporter.downloadCalibration()}
        disabled={busy || editor.cellPitch < 1}
      >
        {exporter.calibrating ? 'Generando hoja…' : 'Hoja de calibración'}
      </button>
      <button
        type="button"
        class="ghost"
        onclick={() => exporter.downloadRipSheet()}
        disabled={busy || editor.cellPitch < 1}
      >
        {exporter.preparingRip ? 'Generando RIP…' : 'Hoja para RIP'}
      </button>
    </div>

    {#if exporter.calibrating || exporter.preparingRip || exporter.exporting}
      <p class="status" role="status">
        <span class="spinner" aria-hidden="true"></span>
        {#if exporter.calibrating}
          Generando hoja de calibración…
        {:else if exporter.preparingRip}
          Generando hoja transparente para RIP…
        {:else}
          Procesando la capa seleccionada…
        {/if}
      </p>
    {/if}

    {#if exporter.lastExportTiming}
      <p class="timing" role="status">
        Tiempo de la última exportación ({exporter.lastExportTiming.label}):
        <strong>{Math.round(exporter.lastExportTiming.ms)} ms</strong>
      </p>
    {/if}

    {#if exporter.warning}
      <p class="warning" role="status">{exporter.warning}</p>
    {/if}

    {#if exporter.message}
      <p class="success" role="status">{exporter.message}</p>
    {/if}

    {#if exporter.error}
      <p class="error" role="alert">{exporter.error}</p>
    {/if}

    <p class="hint">
      <strong>Color</strong> es la separación de tinta, sin blanco ni choke.
      <strong>Base blanca</strong> aplica el tipo de base y el choke.
      <strong>Composite</strong> combina ambos sobre el color de camiseta. Los PNG
      salen transparentes y con el DPI físico declarado.
    </p>
    <p class="hint">
      <strong>Hoja para RIP</strong> es una placa de color transparente de
      4 × 5,33″ sin fondos ni base blanca: el RIP la genera desde el alfa.
    </p>
  </details>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    margin-top: 0.55rem;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    padding: 0.15rem 0.8rem 0.85rem;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: color-mix(in srgb, var(--surface-2) 45%, var(--surface));
    scroll-margin-block: 0.75rem;
  }

  .group-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 46px;
    margin: 0 -0.8rem;
    padding: 0.65rem 0.8rem;
    border-radius: 11px;
    color: var(--text);
    font-size: 0.79rem;
    font-weight: 650;
    cursor: pointer;
    list-style: none;
  }

  .group-title::-webkit-details-marker { display: none; }
  .group-title:hover { background: color-mix(in srgb, var(--surface-3) 60%, transparent); }

  .subsection {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding-bottom: 0.7rem;
    border-bottom: 1px solid var(--border);
  }

  .subsection-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .subsection h3 {
    margin: 0 0 0.25rem;
    color: var(--primary-text);
    font-size: 0.7rem;
    font-weight: 650;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .reset-size {
    min-height: 40px;
    padding: 0.35rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--surface-2);
    color: var(--text-2);
    font: 0.65rem/1.2 var(--mono);
    cursor: pointer;
  }

  .reset-size:disabled { opacity: 0.45; cursor: not-allowed; }

  .field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-height: 42px;
    color: var(--text-2);
    font-size: 0.78rem;
  }

  .field input[type='number'] {
    width: 6rem;
    min-height: 42px;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font: 0.82rem/1.2 var(--mono);
    font-variant-numeric: tabular-nums;
    text-align: right;
    color-scheme: dark;
  }

  .field input[type='number']:focus-visible,
  .select-field select:focus-visible,
  .reset-size:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
  }

  .field input:disabled { opacity: 0.45; }

  .output-options {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .select-field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    min-height: 44px;
    color: var(--text-2);
    font-size: 0.78rem;
  }

  .select-field select {
    min-width: 140px;
    min-height: 44px;
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font-family: inherit;
    font-size: 0.76rem;
    line-height: 1.2;
  }

  .switch {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-height: 44px;
    color: var(--text-2);
    font-size: 0.76rem;
  }

  .switch input { width: 1.15rem; height: 1.15rem; accent-color: var(--primary); }

  .output-pixels {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    margin: 0;
    padding: 0.55rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--muted);
    font-size: 0.7rem;
  }

  .output-pixels strong { color: var(--cyan); font: 0.72rem/1.2 var(--mono); }
  .format-note { display: flex; flex-direction: column; gap: 0.2rem; margin: 0; padding: 0.45rem 0.55rem; border-left: 2px solid var(--cyan); color: var(--muted); font-size: 0.69rem; line-height: 1.4; }
  .format-note strong { color: var(--text); font: 600 0.7rem/1.2 var(--mono); }

  .chevron {
    width: 8px;
    height: 8px;
    border-right: 1.5px solid var(--muted);
    border-bottom: 1.5px solid var(--muted);
    transform: rotate(225deg) translate(-1px, -1px);
  }

  .group:not([open]) .chevron { transform: rotate(45deg) translateY(-2px); }

  .summary {
    margin: 0;
    padding: 0.6rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text-2);
    font: 0.71rem/1.5 var(--mono);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .field-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem;
    min-height: 38px;
  }

  .field-head label {
    color: var(--text-2);
    font-size: 0.8rem;
    line-height: 1.35;
  }

  .number-input {
    width: 5.2rem;
    min-height: 42px;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font: 0.85rem/1.2 var(--mono);
    font-variant-numeric: tabular-nums;
    text-align: right;
    color-scheme: dark;
  }

  .number-input:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
  }

  .preflight { display: flex; flex-direction: column; gap: 0.4rem; }
  .preflight-summary { margin: 0; color: var(--text-2); font: 0.71rem/1.5 var(--mono); }

  .preflight-note {
    margin: 0;
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.73rem;
    line-height: 1.45;
  }

  .preflight-note.info {
    border-color: #245562;
    background: #142b33;
    color: #9deafa;
  }

  .preflight-note.warning {
    border-color: #715529;
    background: var(--warning-surface);
    color: var(--warning);
  }

  .actions { display: flex; flex-direction: column; gap: 0.4rem; }

  .actions button {
    min-height: 44px;
    padding: 0.55rem 0.65rem;
    border-radius: 8px;
    font-size: 0.77rem;
    font-weight: 650;
    cursor: pointer;
  }

  .primary { border: 1px solid var(--primary); background: var(--primary); color: var(--primary-ink); }
  .primary:hover { background: #7546e8; }
  .ghost { border: 1px solid var(--border); background: var(--surface-2); color: var(--text); }
  .ghost:hover { border-color: var(--primary-text); }

  .actions button:disabled { opacity: 0.4; cursor: not-allowed; }
  .actions button:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }

  .status { display: flex; align-items: center; gap: 0.5rem; margin: 0; color: var(--cyan); font-size: 0.76rem; line-height: 1.4; }
  .spinner { width: 0.85rem; height: 0.85rem; border: 2px solid rgb(34 211 238 / 24%); border-top-color: var(--cyan); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .timing { margin: 0; padding: 0.5rem 0.6rem; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--cyan); font: 0.72rem/1.4 var(--mono); }
  .timing strong { color: var(--text); font-weight: 650; }
  .warning { margin: 0; padding: 0.55rem 0.6rem; border: 1px solid #715529; border-radius: 8px; background: var(--warning-surface); color: var(--warning); font-size: 0.73rem; line-height: 1.45; }
  .success { margin: 0; color: var(--success); font-size: 0.76rem; line-height: 1.4; overflow-wrap: anywhere; }
  .error { margin: 0; padding: 0.55rem 0.6rem; border: 1px solid #71303d; border-radius: 8px; background: var(--error-surface); color: var(--error); font-size: 0.76rem; line-height: 1.4; }
  .hint { margin: 0; color: var(--muted); font-size: 0.72rem; line-height: 1.5; }

  @media (max-width: 880px) {
    .panel { margin-top: 0.5rem; }
    .number-input { min-height: 48px; }
    .field input[type='number'] { min-height: 48px; }
    .reset-size { min-height: 44px; }
  }
</style>
