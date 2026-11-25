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
  <span class="item document-item" title={doc.selectedName}>
    <span class="key">Documento</span>
    <span class="document-name">{doc.selectedName}</span>
  </span>
  <span class="item"><span class="key">Dim</span>{dimensions}</span>
  <span class="item"><span class="key">Físico</span>{physical}</span>
  <span class="item"><span class="key">DPI</span>{editor.dpi}</span>
  <span class="item"><span class="key">LPI</span>{editor.lpi}</span>
  <span class="item"><span class="key">Zoom</span>{zoom}</span>
  <span class="item"><span class="key">Trama</span>{editor.polarity === 'light' ? 'Luces' : 'Sombras'}</span>
  <span class="spacer"></span>
  {#if exporter.lastExportTiming}
    <span class="item export-timing"><span class="key">Export</span>{Math.round(exporter.lastExportTiming.ms)} ms</span>
  {/if}
  <span class="item state" class:ready={doc.exportReady}>{state}</span>
</footer>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.4rem 0.1rem;
    border-top: 1px solid var(--border);
    font: 0.69rem/1.3 var(--mono);
    color: var(--text-2);
    overflow-x: auto;
    scrollbar-width: none;
  }

  .document-item {
    display: none;
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

  .document-name {
    min-width: 0;
    overflow: hidden;
    color: var(--text);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .key {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.66rem;
  }

  .spacer {
    flex: 1;
  }

  .state {
    color: var(--warning);
  }

  .state.ready {
    color: var(--success);
  }

  @media (max-width: 880px) {
    .status-bar {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      align-items: center;
      gap: 0.4rem 0.6rem;
      padding: 0.45rem 0.1rem 0.2rem;
      overflow: visible;
      font-size: 0.68rem;
    }

    .document-item {
      display: flex;
      grid-column: span 2;
    }

    .item {
      min-width: 0;
      flex-wrap: wrap;
      gap: 0.18rem 0.3rem;
      white-space: normal;
      overflow-wrap: anywhere;
    }

    .key {
      font-size: 0.59rem;
    }

    .spacer {
      display: none;
    }

    .state {
      grid-column: 3;
      grid-row: 1;
      justify-self: end;
      white-space: nowrap;
    }

    .export-timing {
      grid-column: 1 / -1;
    }
  }
</style>
