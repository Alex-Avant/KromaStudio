<script lang="ts">
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

  const dimensions = $derived(
    doc.imageStats ? `${doc.imageStats.width} × ${doc.imageStats.height} px` : '—',
  );
  const outputWidthIn = $derived(
    exporter.physicalWidthIn ?? (doc.imageStats ? doc.imageStats.width / Math.max(1, editor.dpi) : null),
  );
  const outputHeightIn = $derived(
    exporter.physicalHeightIn ?? (doc.imageStats ? doc.imageStats.height / Math.max(1, editor.dpi) : null),
  );
  const outputPixels = $derived(
    outputWidthIn !== null && outputHeightIn !== null
      ? `${Math.round(outputWidthIn * editor.dpi)} × ${Math.round(outputHeightIn * editor.dpi)} px`
      : '—',
  );
  const outputSize = $derived(
    outputWidthIn !== null && outputHeightIn !== null
      ? `${(outputWidthIn * (exporter.sizeUnit === 'cm' ? 2.54 : 1)).toFixed(2)} × ${(outputHeightIn * (exporter.sizeUnit === 'cm' ? 2.54 : 1)).toFixed(2)} ${exporter.sizeUnit}`
      : '—',
  );
  const state = $derived(
    !doc.hasDocument ? 'Sin documento' : doc.exportReady ? 'Listo' : 'Preparando…',
  );
  const zoom = $derived(editor.previewMode === 'actual' ? `${editor.zoomPercent} %` : 'Ajustar');
  const screen = $derived(`${DOT_SHAPE_LABELS[editor.dotShape]} · ${editor.angle}°`);
</script>

<footer class="status-bar" aria-label="Información técnica del documento">
  <span class="item document-item" title={doc.selectedName}>
    <span class="key">Documento</span>
    <span class="document-name">{doc.selectedName}</span>
  </span>
  <span class="item source-value">
    <span class="key">Fuente px</span>
    <span>{dimensions}</span>
  </span>
  <span class="item source-value" title="El navegador no conserva los metadatos DPI originales al decodificar la imagen.">
    <span class="key">DPI fuente</span>
    <span>—</span>
  </span>
  <span class="item output-size">
    <span class="key">Salida px</span>
    <span>{outputPixels}</span>
  </span>
  <span class="item output-size">
    <span class="key">Tamaño salida</span>
    <span>{outputSize}</span>
  </span>
  <span class="item output-value"><span class="key">DPI salida</span><span>{editor.dpi}</span></span>
  <span class="item output-value"><span class="key">LPI</span><span>{editor.lpi}</span></span>
  <span class="item output-value"><span class="key">Zoom</span><span>{zoom}</span></span>
  <span class="item output-value"><span class="key">Trama</span><span>{screen}</span></span>
  {#if exporter.lastExportInfo?.downscaled}
    <span class="item effective-dpi"><span class="key">DPI efectivo última salida</span><span>{Math.round(exporter.lastExportInfo.effectiveDpi ?? 0)}</span></span>
  {/if}
  {#if exporter.lastExportTiming}
    <span class="item export-timing"><span class="key">Export</span><span>{Math.round(exporter.lastExportTiming.ms)} ms</span></span>
  {/if}
  <span class="item state" class:ready={doc.exportReady}>{state}</span>
</footer>

<style>
  .status-bar {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: center;
    gap: 0.3rem 0.65rem;
    min-width: 0;
    padding: 0.45rem 0.1rem;
    border-top: 1px solid var(--border);
    color: var(--text-2);
    font: 0.68rem/1.35 var(--mono);
  }

  .document-item { display: none; }

  .item {
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
    min-width: 0;
    white-space: nowrap;
  }

  .key {
    color: var(--muted);
    font-size: 0.61rem;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .source-value > span:last-child,
  .output-size > span:last-child { color: var(--text); }

  .output-value > span:last-child { color: var(--cyan); }

  .document-name {
    min-width: 0;
    overflow: hidden;
    color: var(--text);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .state { justify-self: end; color: var(--warning); }
  .state.ready { color: var(--success); }

  @media (max-width: 880px) {
    .status-bar {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.35rem 0.55rem;
      padding: 0.45rem 0.1rem 0.2rem;
      font-size: 0.67rem;
    }

    .document-item {
      display: flex;
      grid-column: span 2;
      min-width: 0;
    }

    .document-item .key { flex: 0 0 auto; }
    .document-name { flex: 1 1 auto; }
    .item:not(.document-item) { flex-wrap: wrap; gap: 0.12rem 0.28rem; white-space: normal; }
    .state { grid-column: 3; grid-row: 1; justify-self: end; white-space: nowrap; }
    .export-timing { grid-column: 1 / -1; }
    .effective-dpi { grid-column: 1 / -1; }
  }
</style>
