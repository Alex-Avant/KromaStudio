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

  const dimensions = $derived(
    doc.imageStats ? `${doc.imageStats.width} × ${doc.imageStats.height} px` : '—',
  );
  const physical = $derived(
    doc.imageStats
      ? `${(doc.imageStats.width / Math.max(1, editor.dpi)).toFixed(2)} × ${(
          doc.imageStats.height / Math.max(1, editor.dpi)
        ).toFixed(2)} in`
      : '—',
  );
  const state = $derived(
    !doc.hasDocument
      ? 'Sin documento'
      : doc.exportReady
        ? 'Listo'
        : 'Preparando…',
  );
  const zoom = $derived(editor.previewMode === 'actual' ? '100 %' : 'Ajustar');
</script>

<footer class="status-bar" aria-label="Estado del documento">
  <span class="item"><span class="key">Dim</span>{dimensions}</span>
  <span class="item"><span class="key">Físico</span>{physical}</span>
  <span class="item"><span class="key">DPI</span>{editor.dpi}</span>
  <span class="item"><span class="key">LPI</span>{editor.lpi}</span>
  <span class="item"><span class="key">Zoom</span>{zoom}</span>
  <span class="item"><span class="key">Trama</span>{editor.polarity === 'light' ? 'Luces' : 'Sombras'}</span>
  <span class="spacer"></span>
  {#if exporter.lastExportTiming}
    <span class="item"><span class="key">Export</span>{Math.round(exporter.lastExportTiming.ms)} ms</span>
  {/if}
  <span class="item state" class:ready={doc.exportReady}>{state}</span>
</footer>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.4rem 0.1rem;
    border-top: 1px solid #1d1f25;
    font: 0.72rem/1.3 ui-monospace, monospace;
    color: #8b857c;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .status-bar::-webkit-scrollbar {
    display: none;
  }

  .item {
    display: inline-flex;
    align-items: baseline;
    gap: 0.3rem;
    white-space: nowrap;
  }

  .key {
    color: #5f5a54;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.66rem;
  }

  .spacer {
    flex: 1;
  }

  .state {
    color: #f0b45f;
  }

  .state.ready {
    color: #9bd6a3;
  }
</style>
