<script lang="ts">
  import type { DocumentState } from '../../state/document.svelte';

  interface Props {
    doc: DocumentState;
    onExport?: () => void;
  }

  let { doc, onExport }: Props = $props();
</script>

<header class="app-header">
  <div class="brand" aria-label="KromaStudio, editor DTF">
    <span class="mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <circle cx="9" cy="9" r="2" /><circle cx="16" cy="9" r="2" /><circle cx="23" cy="9" r="2" />
        <circle cx="9" cy="16" r="2" /><circle cx="16" cy="16" r="2" /><circle cx="23" cy="16" r="2" />
        <circle cx="9" cy="23" r="2" /><circle cx="16" cy="23" r="2" /><circle cx="23" cy="23" r="2" />
      </svg>
    </span>
    <span class="brand-text">
      <span class="brand-name">KromaStudio</span>
      <span class="brand-sub">DTF · HALFTONE LAB</span>
    </span>
  </div>

  <p class="document" title={doc.selectedName}>
    <span class="document-led" aria-hidden="true"></span>
    <span class="document-label">Documento</span>
    <span class="document-name">{doc.selectedName}</span>
  </p>

  <div class="actions">
    <button type="button" class="ghost" onclick={() => doc.openFilePicker()}>
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5M4 12.5v3A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5v-3" /></svg>
      Importar imagen
    </button>
    <button type="button" class="primary" onclick={() => onExport?.()}>
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3v10m0 0 3.5-3.5M10 13l-3.5-3.5M4 13.5v2A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5v-2" /></svg>
      Exportar
    </button>
  </div>
</header>

<style>
  .app-header {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    min-height: 66px;
    padding: 0.65rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    min-width: 185px;
  }

  .mark {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    border: 1px solid color-mix(in srgb, var(--primary) 48%, var(--border));
    border-radius: 11px;
    background: color-mix(in srgb, var(--primary) 16%, var(--surface-2));
    color: var(--primary-text);
  }

  .mark svg {
    width: 26px;
    height: 26px;
    fill: currentColor;
  }

  .brand-text {
    display: grid;
    gap: 0.2rem;
    line-height: 1.15;
  }

  .brand-name {
    color: var(--text);
    font-size: 0.92rem;
    font-weight: 700;
    letter-spacing: -0.025em;
  }

  .brand-sub {
    color: var(--cyan);
    font: 600 0.56rem/1.2 var(--mono);
    letter-spacing: 0.11em;
  }

  .document {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    flex: 1;
    min-width: 0;
    margin: 0;
    color: var(--text-2);
    font: 0.75rem/1.3 var(--mono);
  }

  .document-led {
    width: 7px;
    height: 7px;
    flex: 0 0 7px;
    border-radius: 50%;
    background: var(--cyan);
    box-shadow: 0 0 12px color-mix(in srgb, var(--cyan) 50%, transparent);
  }

  .document-label {
    color: var(--muted);
    font: 600 0.59rem/1.2 var(--mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .document-name {
    min-width: 0;
    overflow: hidden;
    color: var(--text);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .actions button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    min-height: 44px;
    padding: 0.5rem 0.8rem;
    border-radius: 9px;
    font-family: inherit;
    font-size: 0.76rem;
    font-weight: 650;
    line-height: 1.2;
    white-space: nowrap;
    cursor: pointer;
    transition: background 140ms ease, border-color 140ms ease, transform 140ms ease;
  }

  .actions svg {
    width: 17px;
    height: 17px;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .actions button:active {
    transform: translateY(1px);
  }

  .primary {
    border: 1px solid var(--primary);
    background: var(--primary);
    color: var(--primary-ink);
  }

  .primary:hover {
    border-color: #7546e8;
    background: #7546e8;
  }

  .ghost {
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
  }

  .ghost:hover {
    border-color: var(--primary-text);
    background: var(--surface-3);
  }

  .actions button:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    .app-header {
      display: flex;
      gap: 0.4rem;
      min-height: 54px;
      padding: max(0.35rem, env(safe-area-inset-top, 0px))
        max(0.55rem, env(safe-area-inset-right, 0px))
        0.35rem
        max(0.55rem, env(safe-area-inset-left, 0px));
    }

    .brand {
      min-width: 0;
      flex: 1 1 auto;
      gap: 0.4rem;
    }

    .mark {
      width: 31px;
      height: 31px;
      flex-basis: 31px;
      border-radius: 8px;
    }

    .mark svg {
      width: 21px;
      height: 21px;
    }

    .brand-name {
      font-size: 0.78rem;
      white-space: nowrap;
    }

    .brand-sub {
      display: none;
    }

    .document {
      display: none;
    }

    .actions {
      flex: 0 0 auto;
      gap: 0.35rem;
    }

    .actions button {
      min-height: 44px;
      gap: 0.3rem;
      padding: 0.35rem 0.42rem;
      font-size: 0.67rem;
    }

    .actions svg {
      width: 14px;
      height: 14px;
    }
  }

  @media (max-width: 375px) {
    .actions button {
      gap: 0.25rem;
      padding-inline: 0.3rem;
      font-size: 0.62rem;
    }

    .actions svg {
      width: 12px;
      height: 12px;
    }

    .brand-name {
      font-size: 0.74rem;
    }
  }
</style>
