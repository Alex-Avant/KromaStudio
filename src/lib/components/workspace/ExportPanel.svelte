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
  <section class="group" id="panel-exportacion">
    <h2 class="group-title">Exportar PNG</h2>

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
  </section>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    padding: 0.9rem 0;
    border-bottom: 1px solid #1d1f25;
  }

  .group:last-child {
    border-bottom: 0;
  }

  .group-title {
    margin: 0;
    font: 600 0.72rem/1.2 ui-monospace, monospace;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #f0b45f;
  }

  .summary {
    margin: 0;
    padding: 0.5rem 0.55rem;
    border: 1px solid #1d1f25;
    border-radius: 7px;
    background: #0f1115;
    font: 0.72rem/1.5 ui-monospace, monospace;
    color: #b0aaa0;
  }

  .preflight {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .preflight-summary {
    margin: 0;
    font: 0.72rem/1.5 ui-monospace, monospace;
    color: #b0aaa0;
  }

  .preflight-note {
    margin: 0;
    padding: 0.4rem 0.5rem;
    border: 1px solid #24262d;
    border-radius: 7px;
    font: 0.74rem/1.45 system-ui, sans-serif;
  }

  .preflight-note.info {
    border-color: #2f3d4e;
    background: #101720;
    color: #a9c7e8;
  }

  .preflight-note.warning {
    border-color: #5c4322;
    background: #1d1710;
    color: #f0b45f;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .actions button {
    padding: 0.5rem 0.6rem;
    border-radius: 7px;
    font: 600 0.78rem/1.2 system-ui, sans-serif;
    cursor: pointer;
  }

  .primary {
    border: 1px solid #f0b45f;
    background: #f0b45f;
    color: #18110a;
  }

  .ghost {
    border: 1px solid #2a2c33;
    background: transparent;
    color: #f0b45f;
  }

  .actions button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font: 0.76rem/1.4 system-ui, sans-serif;
    color: #f0b45f;
  }

  .spinner {
    width: 0.85rem;
    height: 0.85rem;
    border: 2px solid rgba(240, 180, 95, 0.25);
    border-top-color: #f0b45f;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .timing {
    margin: 0;
    padding: 0.4rem 0.5rem;
    border: 1px solid #3b3325;
    border-radius: 7px;
    background: #17130d;
    font: 0.74rem/1.4 ui-monospace, monospace;
    color: #f0b45f;
  }

  .timing strong {
    color: #f5f0e8;
    font-weight: 600;
  }

  .warning {
    margin: 0;
    padding: 0.45rem 0.5rem;
    border: 1px solid #5c4322;
    border-radius: 7px;
    background: #1d1710;
    font: 0.74rem/1.45 system-ui, sans-serif;
    color: #f0b45f;
  }

  .success {
    margin: 0;
    font: 0.76rem/1.4 system-ui, sans-serif;
    color: #9bd6a3;
    overflow-wrap: anywhere;
  }

  .error {
    margin: 0;
    font: 0.78rem/1.4 system-ui, sans-serif;
    color: #ffb4a8;
  }

  .hint {
    margin: 0;
    font: 0.75rem/1.5 system-ui, sans-serif;
    color: #7f7a73;
  }
</style>
