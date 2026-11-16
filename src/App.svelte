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
    exportacion: 'panel-exportacion',
  };

  let activeSection = $state<WorkspaceSection>('halftone');

  function focusSection(section: WorkspaceSection): void {
    activeSection = section;
    const id = SECTION_IDS[section];
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  <WorkspaceHeader {doc} onExport={() => focusSection('exportacion')} />

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

    <aside class="inspector" aria-label="Inspector del semitono">
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
    background: #0a0b0e;
  }

  .body {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr) 330px;
    min-height: 0;
    overflow: hidden;
  }

  .main {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
    min-height: 0;
    padding: 0.75rem 0.9rem;
    overflow: hidden;
  }

  .inspector {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 0 0.9rem 1rem;
    border-left: 1px solid #1d1f25;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  @media (max-width: 880px) {
    .shell {
      height: auto;
      min-height: 100svh;
      overflow: visible;
    }

    .body {
      grid-template-columns: minmax(0, 1fr);
      overflow: visible;
    }

    .main {
      padding: 0.75rem 0.75rem 0.5rem;
      overflow: visible;
    }

    .inspector {
      border-left: 0;
      border-top: 1px solid #1d1f25;
      padding: 0 0.75rem 1rem;
      overflow-y: visible;
    }
  }
</style>
