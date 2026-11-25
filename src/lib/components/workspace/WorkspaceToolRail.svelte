<script lang="ts">
  export type WorkspaceSection =
    | 'imagen'
    | 'ajustes'
    | 'halftone'
    | 'separaciones'
    | 'exportacion';

  interface Props {
    active?: WorkspaceSection;
    onSelect?: (section: WorkspaceSection) => void;
    variant?: 'all' | 'desktop' | 'mobile';
  }

  let { active = 'halftone', onSelect, variant = 'all' }: Props = $props();

  const desktopItems: Array<{ id: WorkspaceSection; label: string; disabled?: boolean }> = [
    { id: 'imagen', label: 'Imagen' },
    { id: 'ajustes', label: 'Ajustes' },
    { id: 'halftone', label: 'Halftone' },
    { id: 'separaciones', label: 'Separaciones' },
    { id: 'exportacion', label: 'Exportar' },
  ];

  const mobileItems = desktopItems;
</script>

{#if variant !== 'mobile'}
<nav class="tool-rail desktop-nav" aria-label="Secciones del editor">
  <span class="rail-caption">WORKSPACE</span>
  {#each desktopItems as item}
    <button
      type="button"
      class:active={active === item.id}
      aria-current={active === item.id ? 'page' : undefined}
      onclick={() => onSelect?.(item.id)}
    >
      <svg class="glyph" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {#if item.id === 'imagen'}
          <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
          <circle cx="9" cy="9" r="1.6" />
          <path d="m5 18 5.2-5 3.1 2.8 2.4-2.2L20 18" />
        {:else if item.id === 'ajustes'}
          <path d="M4 7h7m4 0h5M4 17h3m4 0h9" />
          <circle cx="13" cy="7" r="2" />
          <circle cx="9" cy="17" r="2" />
        {:else if item.id === 'halftone'}
          <circle cx="6" cy="6" r="1.4" />
          <circle cx="12" cy="6" r="1.4" />
          <circle cx="18" cy="6" r="1.4" />
          <circle cx="6" cy="12" r="1.4" />
          <circle cx="12" cy="12" r="1.4" />
          <circle cx="18" cy="12" r="1.4" />
          <circle cx="6" cy="18" r="1.4" />
          <circle cx="12" cy="18" r="1.4" />
          <circle cx="18" cy="18" r="1.4" />
        {:else if item.id === 'separaciones'}
          <rect x="4" y="4" width="12" height="12" rx="2" />
          <path d="M8 20h9a3 3 0 0 0 3-3V8" />
          <path d="M8 8h4M8 12h4" />
        {:else}
          <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
          <path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
        {/if}
      </svg>
      <span class="label">{item.label}</span>
    </button>
  {/each}
</nav>
{/if}

{#if variant !== 'desktop'}
<nav class="mobile-nav" aria-label="Navegación móvil del editor">
  {#each mobileItems as item}
    <button
      type="button"
      class:active={active === item.id}
      aria-current={active === item.id ? 'page' : undefined}
      onclick={() => onSelect?.(item.id)}
    >
      <svg class="glyph" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {#if item.id === 'imagen'}
          <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
          <circle cx="9" cy="9" r="1.6" />
          <path d="m5 18 5.2-5 3.1 2.8 2.4-2.2L20 18" />
        {:else if item.id === 'ajustes'}
          <path d="M4 7h7m4 0h5M4 17h3m4 0h9" />
          <circle cx="13" cy="7" r="2" />
          <circle cx="9" cy="17" r="2" />
        {:else if item.id === 'halftone'}
          <circle cx="6" cy="6" r="1.4" /><circle cx="12" cy="6" r="1.4" /><circle cx="18" cy="6" r="1.4" />
          <circle cx="6" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="18" cy="12" r="1.4" />
          <circle cx="6" cy="18" r="1.4" /><circle cx="12" cy="18" r="1.4" /><circle cx="18" cy="18" r="1.4" />
        {:else if item.id === 'separaciones'}
          <rect x="4" y="4" width="12" height="12" rx="2" /><path d="M8 20h9a3 3 0 0 0 3-3V8M8 8h4M8 12h4" />
        {:else}
          <path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
        {/if}
      </svg>
      <span class="label">{item.label}</span>
    </button>
  {/each}
</nav>
{/if}

<style>
  .tool-rail {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.8rem 0.55rem;
    border-right: 1px solid var(--border);
    background: var(--surface);
  }

  .rail-caption {
    margin: 0.2rem 0 0.45rem;
    color: var(--muted);
    font: 600 0.55rem/1.2 var(--mono);
    letter-spacing: 0.12em;
    text-align: center;
  }

  .tool-rail button,
  .mobile-nav button {
    position: relative;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 0.38rem;
    min-height: 64px;
    padding: 0.55rem 0.25rem;
    border: 1px solid transparent;
    border-radius: 11px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition: color 140ms ease, background 140ms ease, border-color 140ms ease;
  }

  .tool-rail button:hover:not(:disabled),
  .mobile-nav button:hover {
    background: var(--surface-2);
    color: var(--text);
  }

  .tool-rail button.active,
  .mobile-nav button.active {
    border-color: color-mix(in srgb, var(--primary) 38%, var(--border));
    background: color-mix(in srgb, var(--primary) 15%, var(--surface));
    color: var(--primary-text);
  }

  .tool-rail button.active::before {
    position: absolute;
    top: 14px;
    bottom: 14px;
    left: -9px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: var(--primary);
    content: '';
  }

  .tool-rail button:focus-visible,
  .mobile-nav button:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
  }

  .glyph {
    width: 22px;
    height: 22px;
    stroke: currentColor;
    stroke-width: 1.65;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .label {
    max-width: 100%;
    font: 600 0.59rem/1.15 var(--mono);
    text-align: center;
    overflow-wrap: anywhere;
  }

  .mobile-nav {
    display: none;
  }

  @media (max-width: 880px) {
    .desktop-nav {
      display: none;
    }

    .mobile-nav {
      position: relative;
      z-index: auto;
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 0.15rem;
      width: 100%;
      min-height: calc(72px + env(safe-area-inset-bottom));
      padding: 0.35rem max(0.35rem, env(safe-area-inset-left)) calc(0.35rem + env(safe-area-inset-bottom));
      border-top: 1px solid var(--border);
      background: color-mix(in srgb, var(--surface) 96%, transparent);
      box-shadow: none;
      backdrop-filter: blur(16px);
    }

    .mobile-nav button {
      min-width: 0;
      min-height: 60px;
      padding: 0.25rem 0.1rem;
      border-radius: 9px;
      gap: 0.25rem;
    }

    .mobile-nav .glyph {
      width: 20px;
      height: 20px;
    }

    .mobile-nav .label {
      font-size: clamp(0.52rem, 2.3vw, 0.64rem);
      line-height: 1.08;
      overflow-wrap: normal;
    }
  }
</style>
