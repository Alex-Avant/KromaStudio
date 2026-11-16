<script lang="ts">
  export type WorkspaceSection = 'imagen' | 'ajustes' | 'halftone' | 'capas' | 'exportacion';

  interface Props {
    active?: WorkspaceSection;
    onSelect?: (section: WorkspaceSection) => void;
  }

  let { active = 'halftone', onSelect }: Props = $props();

  const items: Array<{ id: WorkspaceSection; label: string; glyph: string; disabled?: boolean }> = [
    { id: 'imagen', label: 'Imagen', glyph: 'Im' },
    { id: 'ajustes', label: 'Ajustes', glyph: 'Aj' },
    { id: 'halftone', label: 'Halftone', glyph: 'Ha' },
    { id: 'capas', label: 'Capas', glyph: 'Ca', disabled: true },
    { id: 'exportacion', label: 'Exportar', glyph: 'Ex' },
  ];
</script>

<nav class="tool-rail" aria-label="Secciones del editor">
  {#each items as item}
    <button
      type="button"
      class:active={active === item.id}
      disabled={item.disabled}
      title={item.disabled ? `${item.label}: próximamente` : item.label}
      onclick={() => onSelect?.(item.id)}
    >
      <span class="glyph" aria-hidden="true">{item.glyph}</span>
      <span class="label">{item.label}</span>
    </button>
  {/each}
</nav>

<style>
  .tool-rail {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem 0.3rem;
    border-right: 1px solid #1d1f25;
    background: #0c0d11;
  }

  .tool-rail button {
    display: grid;
    justify-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.2rem;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: #8b857c;
    cursor: pointer;
  }

  .tool-rail button:hover:not(:disabled) {
    background: #121419;
    color: #cfc9bf;
  }

  .tool-rail button.active {
    border-color: #2a2c33;
    background: #14161b;
    color: #f0b45f;
  }

  .tool-rail button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .tool-rail button:focus-visible {
    outline: 2px solid #f0b45f;
    outline-offset: 2px;
  }

  .glyph {
    font: 600 0.72rem/1 ui-monospace, monospace;
    letter-spacing: 0.04em;
  }

  .label {
    max-width: 100%;
    font: 0.6rem/1.2 ui-monospace, monospace;
    letter-spacing: 0.03em;
    text-align: center;
    text-transform: uppercase;
    overflow-wrap: anywhere;
  }

  @media (max-width: 880px) {
    .tool-rail {
      flex-direction: row;
      justify-content: space-between;
      overflow-x: auto;
      border-right: 0;
      border-bottom: 1px solid #1d1f25;
      scrollbar-width: none;
    }

    .tool-rail::-webkit-scrollbar {
      display: none;
    }

    .tool-rail button {
      flex: 1 0 auto;
    }
  }
</style>
