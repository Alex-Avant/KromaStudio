<script lang="ts">
  import type { DocumentState } from '../../state/document.svelte';

  interface Props {
    doc: DocumentState;
    onExport?: () => void;
  }

  let { doc, onExport }: Props = $props();
</script>

<header class="app-header">
  <div class="brand">
    <span class="mark" aria-hidden="true">K</span>
    <span class="brand-text">
      <span class="brand-name">KromaStudio</span>
      <span class="brand-sub">DTF Halftone</span>
    </span>
  </div>

  <p class="document" title={doc.selectedName}>{doc.selectedName}</p>

  <div class="actions">
    <button type="button" class="ghost" onclick={() => doc.openFilePicker()}>
      Importar imagen
    </button>
    <button type="button" class="primary" onclick={() => onExport?.()}>Exportar</button>
  </div>
</header>

<style>
  .app-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.55rem 0.9rem;
    border-bottom: 1px solid #1d1f25;
    background: #0c0d11;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
  }

  .mark {
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 6px;
    background: #f0b45f;
    color: #18110a;
    font: 700 0.95rem/1 system-ui, sans-serif;
  }

  .brand-text {
    display: grid;
    line-height: 1.15;
  }

  .brand-name {
    font: 600 0.85rem/1.2 system-ui, sans-serif;
    color: #f5f0e8;
  }

  .brand-sub {
    font: 0.62rem/1.2 ui-monospace, monospace;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #6f6a63;
  }

  .document {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    font: 0.78rem/1.3 ui-monospace, monospace;
    color: #a8a29a;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .actions button {
    padding: 0.42rem 0.7rem;
    border-radius: 7px;
    font: 600 0.76rem/1.2 system-ui, sans-serif;
    white-space: nowrap;
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
    color: #cfc9bf;
  }

  .actions button:focus-visible {
    outline: 2px solid #f0b45f;
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    .document {
      display: none;
    }
  }
</style>
