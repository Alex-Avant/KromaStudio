<script lang="ts">
  import { buildPreflightWarnings, preflightSummary } from '../../utils/preflight';
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

  const exportSummary = $derived(
    `Ajustes: ${editor.colorMode === 'color' ? 'Color Original' : 'Monocromo'} · ${
      editor.polarity === 'light' ? 'Luces imprimen' : 'Sombras imprimen'
    } · ${editor.lpi} LPI · ${editor.angle}° · ${DOT_SHAPE_LABELS[editor.dotShape]} · ${
      editor.dpi
    } DPI. ` +
      (editor.underbase
        ? `Blanco/Composite: base ${
            editor.underbaseStyle === 'solid' ? 'sólida' : 'tramada'
          } y choke ${editor.choke} px.`
        : 'Underbase desactivado: solo hay capa Color.') +
      ' La capa Color nunca incluye base ni choke.',
  );

  const preflightImage = $derived(
    doc.imageStats ? preflightSummary(doc.imageStats, editor.dpi) : null,
  );
  const preflightWarnings = $derived(
    doc.imageStats ? buildPreflightWarnings(doc.imageStats, editor.polarity) : [],
  );

  const busy = $derived(
    exporter.exporting !== null || exporter.calibrating || exporter.preparingRip,
  );
</script>

<div class="panel">
  <details class="group" id="panel-exportacion" open>
    <summary class="group-title">Exportación <span class="chevron" aria-hidden="true"></span></summary>

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
  }
</style>
