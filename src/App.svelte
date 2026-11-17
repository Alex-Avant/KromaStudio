<script lang="ts">
  import { onMount } from 'svelte';
  import ExportPanel from './lib/components/workspace/ExportPanel.svelte';
  import PreviewWorkspace from './lib/components/workspace/PreviewWorkspace.svelte';
  import PropertiesPanel from './lib/components/workspace/PropertiesPanel.svelte';
  import WorkspaceHeader from './lib/components/workspace/WorkspaceHeader.svelte';
  import WorkspaceStatusBar from './lib/components/workspace/WorkspaceStatusBar.svelte';
  import WorkspaceToolRail, {
    type WorkspaceSection,
  } from './lib/components/workspace/WorkspaceToolRail.svelte';
  import { DocumentState } from './lib/state/document.svelte';
  import { EditorState } from './lib/state/editor.svelte';
  import { ExportState } from './lib/state/export.svelte';
  import { loadHalftoneSettings, saveHalftoneSettings } from './lib/utils/settings';

  // Estado del editor, documento y exportación.
  const editor = new EditorState(loadHalftoneSettings());
  const doc = new DocumentState();
  const exporter = new ExportState();

  exporter.getOptions = () => ({
    lpi: editor.lpi,
    angle: editor.angle,
    contrast: editor.contrast,
    gamma: editor.gamma,
    minDot: editor.minDot,
    shadowPoint: editor.shadowPoint,
    dotShape: editor.dotShape,
    dpi: editor.dpi,
    underbase: editor.underbase,
    choke: editor.choke,
    underbaseStyle: editor.underbaseStyle,
    colorMode: editor.colorMode,
    polarity: editor.polarity,
    blackPoint: editor.blackPoint,
    whitePoint: editor.safeWhitePoint,
    shirtColor: editor.shirtColor,
  });

  const SECTION_IDS: Record<WorkspaceSection, string | null> = {
    imagen: 'panel-imagen',
    ajustes: 'panel-tonal',
    halftone: 'panel-trama',
    capas: null,
    separaciones: 'panel-separaciones',
    exportacion: 'panel-exportacion',
  };

  let activeSection = $state<WorkspaceSection>('halftone');
  let mobilePanelOpen = $state(false);
  const activeSectionLabel = $derived(
    ({
      imagen: 'Imagen',
      ajustes: 'Ajustes',
      halftone: 'Halftone',
      capas: 'Capas',
      separaciones: 'Separaciones',
      exportacion: 'Exportar',
    })[activeSection],
  );

  function focusSection(section: WorkspaceSection, toggleIfActive = true): void {
    if (section === 'capas') return;
    const mobile = window.matchMedia('(max-width: 880px)').matches;

    if (mobile && toggleIfActive && activeSection === section && mobilePanelOpen) {
      mobilePanelOpen = false;
      return;
    }

    activeSection = section;
    if (mobile) mobilePanelOpen = true;
    const id = SECTION_IDS[section];
    if (!id) return;
    requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (mobile) {
        document.querySelectorAll<HTMLDetailsElement>('.inspector details').forEach((section) => {
          section.open = section === target;
        });
      }
      if (target instanceof HTMLDetailsElement) target.open = true;
      target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  onMount(() => {
    void doc.loadDemo();
    return () => doc.dispose();
  });

  // Mantiene el blanco por encima del negro cuando se sube el black point.
  $effect(() => {
    const minWhite = Math.max(0.1, editor.blackPoint + 0.01);
    if (editor.whitePoint < minWhite) editor.whitePoint = minWhite;
  });

  // Guarda los ajustes en este navegador con un pequeño debounce para no
  // escribir en cada evento del slider.
  $effect(() => {
    const settings = editor.toSettings();
    const handle = setTimeout(() => saveHalftoneSettings(settings), 250);
    return () => clearTimeout(handle);
  });
</script>

<svelte:head>
  <title>KromaStudio — Workspace de semitono DTF</title>
  <meta
    name="description"
    content="Editor local-first de semitonos AM y underbase para impresión DTF."
  />
</svelte:head>

<div class="shell" class:sheet-open={mobilePanelOpen}>
  <WorkspaceHeader {doc} onExport={() => focusSection('exportacion', false)} />

  <div class="body">
    <WorkspaceToolRail active={activeSection} onSelect={focusSection} />

    <main class="main">
      <PreviewWorkspace
        {editor}
        {doc}
        onCanvas={(handle) => {
          exporter.canvas = handle;
        }}
      />
      <WorkspaceStatusBar {editor} {doc} exporter={exporter} />
    </main>

    <aside class="inspector" class:mobile-open={mobilePanelOpen} aria-label="Inspector del semitono">
      <div class="sheet-head">
        <span class="sheet-grab" aria-hidden="true"></span>
        <span class="sheet-title">{activeSectionLabel}</span>
        <button type="button" class="sheet-close" onclick={() => (mobilePanelOpen = false)} aria-label="Cerrar panel">Cerrar</button>
      </div>
      <PropertiesPanel {editor} {doc} />
      <ExportPanel {editor} {doc} {exporter} />
    </aside>
  </div>
</div>

<style>
  .shell {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    height: 100svh;
    overflow: hidden;
    background: var(--bg);
  }

  .body {
    display: grid;
    grid-template-columns: 100px minmax(0, 1fr) 344px;
    min-height: 0;
    overflow: hidden;
  }

  .main {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
    min-height: 0;
    padding: 0.9rem 1rem;
    overflow: hidden;
  }

  .inspector {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 0.25rem 0.9rem 1rem;
    border-left: 1px solid var(--border);
    overflow-y: auto;
    scrollbar-width: thin;
  }

  .sheet-head {
    display: none;
  }

  @media (max-width: 880px) {
    .shell {
      height: auto;
      min-height: 100svh;
      overflow: visible;
      padding-bottom: 72px;
    }

    .body {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      overflow: visible;
    }

    .main {
      min-height: 0;
      height: min(62svh, 660px);
      padding: 0.65rem 0.65rem 0.45rem;
      overflow: hidden;
    }

    .inspector {
      position: fixed;
      z-index: 30;
      right: 0;
      bottom: 72px;
      left: 0;
      display: block;
      max-height: min(46svh, 520px);
      padding: 0 0.85rem 1rem;
      border: 1px solid var(--border);
      border-bottom: 0;
      border-radius: 18px 18px 0 0;
      background: var(--surface);
      box-shadow: 0 -16px 44px rgb(0 0 0 / 38%);
      overflow: auto;
      transform: translateY(calc(100% + 80px));
      visibility: hidden;
      transition: transform 220ms ease, visibility 220ms ease;
      scrollbar-width: thin;
    }

    .inspector.mobile-open {
      transform: translateY(0);
      visibility: visible;
    }

    .sheet-head {
      position: sticky;
      top: -1px;
      z-index: 2;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      min-height: 54px;
      margin: 0 -0.85rem 0.15rem;
      padding: 0.35rem 0.85rem;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }

    .sheet-grab {
      position: absolute;
      top: 7px;
      left: 50%;
      width: 36px;
      height: 4px;
      border-radius: 4px;
      background: var(--muted);
      opacity: 0.55;
      transform: translateX(-50%);
    }

    .sheet-title {
      grid-column: 2;
      padding-top: 0.45rem;
      color: var(--text);
      font-size: 0.84rem;
      font-weight: 650;
    }

    .sheet-close {
      grid-column: 3;
      justify-self: end;
      min-height: 44px;
      padding: 0 0.7rem;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--surface-2);
      color: var(--text-2);
      font: inherit;
    }

    .main :global(.status-bar) {
      padding: 0.4rem 0.1rem;
    }
  }

  @media (max-width: 420px) {
    .main {
      height: 59svh;
    }
  }
</style>
