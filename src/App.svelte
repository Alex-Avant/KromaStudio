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
  let mobileSheetState = $state<'closed' | 'peek' | 'expanded'>('closed');
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

  function focusSection(section: WorkspaceSection, forceExpanded = false): void {
    if (section === 'capas') return;
    const mobile = window.matchMedia('(max-width: 880px)').matches;
    const isCurrentSection = activeSection === section;

    if (mobile) {
      if (forceExpanded) {
        mobileSheetState = 'expanded';
      } else if (!isCurrentSection) {
        mobileSheetState = 'peek';
      } else {
        mobileSheetState = mobileSheetState === 'closed' ? 'peek' : 'closed';
      }
    }

    activeSection = section;
    const id = SECTION_IDS[section];
    if (!id) return;
    requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (mobile) {
        document.querySelectorAll<HTMLDetailsElement>('.inspector details').forEach((section) => {
          section.open = mobileSheetState !== 'closed' && section === target;
        });
      }
      if (!mobile && target instanceof HTMLDetailsElement) target.open = true;
      if (mobile && mobileSheetState === 'expanded' && target) {
        scrollSheetTo(target);
      } else if (!mobile) {
        target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  function scrollSheetTo(target: HTMLElement): void {
    const content = document.getElementById('mobile-sheet-content');
    if (!content) return;

    const offset = target.getBoundingClientRect().top - content.getBoundingClientRect().top;
    content.scrollTo({ top: content.scrollTop + offset - 8, behavior: 'smooth' });
  }

  function toggleSheetExpansion(): void {
    mobileSheetState = mobileSheetState === 'expanded' ? 'peek' : 'expanded';
    if (mobileSheetState !== 'expanded') return;

    const id = SECTION_IDS[activeSection];
    if (!id) return;
    requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (target instanceof HTMLDetailsElement) target.open = true;
      if (target) scrollSheetTo(target);
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

<div class="shell">
  <WorkspaceHeader {doc} onExport={() => focusSection('exportacion', true)} />

  <div class="body">
    <WorkspaceToolRail variant="desktop" active={activeSection} onSelect={focusSection} />

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

    <aside
      class="inspector"
      class:mobile-closed={mobileSheetState === 'closed'}
      class:mobile-peek={mobileSheetState === 'peek'}
      class:mobile-expanded={mobileSheetState === 'expanded'}
      aria-label="Inspector del semitono"
    >
      <div class="sheet-head">
        <button
          type="button"
          class="sheet-expand"
          aria-expanded={mobileSheetState === 'expanded'}
          aria-controls="mobile-sheet-content"
          aria-label={mobileSheetState === 'expanded' ? 'Contraer panel' : 'Expandir panel'}
          onclick={toggleSheetExpansion}
        >
          <span class="sheet-grab" aria-hidden="true"></span>
          <span class="sheet-title">{activeSectionLabel}</span>
          <span class="sheet-expand-label">{mobileSheetState === 'expanded' ? 'Contraer' : 'Expandir'}</span>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d={mobileSheetState === 'expanded' ? 'm5 12 5-5 5 5' : 'm5 8 5 5 5-5'} />
          </svg>
        </button>
        <button
          type="button"
          class="sheet-close"
          onclick={() => (mobileSheetState = 'closed')}
          aria-label="Cerrar panel"
        >
          Cerrar
        </button>
      </div>
      <div class="sheet-content" id="mobile-sheet-content">
        <PropertiesPanel {editor} {doc} />
        <ExportPanel {editor} {doc} {exporter} />
      </div>
    </aside>

    <WorkspaceToolRail variant="mobile" active={activeSection} onSelect={focusSection} />
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
      display: flex;
      flex-direction: column;
      height: 100dvh;
      min-height: 100svh;
      overflow: hidden;
    }

    .body {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      width: 100%;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }

    .main {
      flex: 1 1 auto;
      width: 100%;
      min-height: 0;
      height: auto;
      padding: 0.45rem 0.55rem 0.35rem;
      overflow: hidden;
    }

    .inspector {
      position: relative;
      z-index: 1;
      display: flex;
      flex: 0 0 auto;
      flex-direction: column;
      width: 100%;
      min-height: 0;
      max-height: none;
      padding: 0 0.55rem;
      border: 0;
      border-top: 1px solid var(--border);
      border-radius: 14px 14px 0 0;
      background: var(--surface);
      box-shadow: 0 -8px 24px rgb(0 0 0 / 18%);
      overflow: hidden;
    }

    .inspector.mobile-closed {
      display: none;
    }

    .inspector.mobile-peek {
      height: 58px;
    }

    .inspector.mobile-expanded {
      flex: 0 0 min(42dvh, 380px);
      height: min(42dvh, 380px);
      max-height: min(42dvh, 380px);
    }

    .sheet-head {
      position: relative;
      display: flex;
      align-items: center;
      flex: 0 0 57px;
      gap: 0.5rem;
      min-height: 57px;
      margin: 0 -0.55rem;
      padding: 0.25rem 0.55rem;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }

    .sheet-grab {
      width: 4px;
      height: 24px;
      flex: 0 0 4px;
      border-radius: 4px;
      background: var(--primary);
      opacity: 0.9;
    }

    .sheet-expand {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex: 1 1 auto;
      min-width: 0;
      min-height: 48px;
      padding: 0 0.35rem;
      border: 0;
      border-radius: 9px;
      background: transparent;
      color: var(--text);
      text-align: left;
      cursor: pointer;
    }

    .sheet-expand:focus-visible,
    .sheet-close:focus-visible {
      outline: 2px solid var(--cyan);
      outline-offset: 2px;
    }

    .sheet-title {
      min-width: 0;
      font-size: 0.82rem;
      font-weight: 650;
    }

    .sheet-expand-label {
      margin-left: auto;
      color: var(--primary-text);
      font-size: 0.68rem;
      white-space: nowrap;
    }

    .sheet-expand svg {
      width: 18px;
      height: 18px;
      flex: 0 0 18px;
      stroke: var(--primary-text);
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .sheet-close {
      flex: 0 0 auto;
      min-height: 44px;
      padding: 0 0.65rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface-2);
      color: var(--text-2);
      font: inherit;
      font-size: 0.7rem;
      cursor: pointer;
    }

    .sheet-content {
      flex: 1 1 auto;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 0.4rem 0.05rem 0.75rem;
      scrollbar-width: thin;
      scrollbar-color: var(--primary) var(--surface-2);
    }

    .mobile-peek .sheet-content {
      display: none;
    }

  }

  @media (max-height: 700px) and (max-width: 880px) {
    .inspector.mobile-expanded {
      flex-basis: min(30dvh, 260px);
      height: min(30dvh, 260px);
      max-height: min(30dvh, 260px);
    }
  }
</style>
