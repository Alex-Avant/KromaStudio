<script lang="ts">
  import { HalftoneCanvas } from '../../index';
  import type { HalftoneCanvasHandle } from '../../types/halftone';
  import type { DocumentState } from '../../state/document.svelte';
  import type { EditorState } from '../../state/editor.svelte';

  interface Props {
    editor: EditorState;
    doc: DocumentState;
    onCanvas?: (handle: HalftoneCanvasHandle | null) => void;
  }

  let { editor, doc, onCanvas }: Props = $props();

  let canvasRef = $state<HalftoneCanvasHandle | null>(null);

  $effect(() => {
    onCanvas?.(canvasRef);
  });

  const onDragEnter = (event: DragEvent) => doc.handleDragEnter(event);
  const onDragOver = (event: DragEvent) => doc.handleDragOver(event);
  const onDragLeave = (event: DragEvent) => doc.handleDragLeave(event);
  const onDrop = (event: DragEvent) => doc.handleDrop(event);
</script>

<div class="preview">
  <div
    class="canvas-area"
    class:dragging={doc.isDragging}
    class:actual={editor.previewMode === 'actual'}
    style={`--shirt-color: ${editor.shirtColor};`}
    role="region"
    aria-label="Vista previa y zona para soltar imágenes"
    ondragenter={onDragEnter}
    ondragover={onDragOver}
    ondragleave={onDragLeave}
    ondrop={onDrop}
  >
    {#if doc.error && !doc.source}
      <p class="load-error">{doc.error}</p>
    {:else if doc.source}
      <HalftoneCanvas
        bind:this={canvasRef}
        src={doc.source}
        lpi={editor.lpi}
        angle={editor.angle}
        contrast={editor.contrast}
        gamma={editor.gamma}
        minDot={editor.minDot}
        shadowPoint={editor.shadowPoint}
        dotShape={editor.dotShape}
        dpi={editor.dpi}
        underbase={editor.underbase}
        choke={editor.choke}
        underbaseStyle={editor.underbaseStyle}
        colorMode={editor.colorMode}
        polarity={editor.polarity}
        blackPoint={editor.blackPoint}
        whitePoint={editor.safeWhitePoint}
        shirtColor={editor.shirtColor}
        showUnderbase={editor.showUnderbase}
        previewMode={editor.previewMode}
        previewView={editor.previewView}
        bind:exportReady={doc.exportReady}
        bind:imageStats={doc.imageStats}
      />
    {:else}
      <div class="empty">
        <p class="empty-title">Sin documento</p>
        <p class="empty-text">
          Importa un PNG, JPG o WebP o arrastra un archivo aquí para empezar la
          trama.
        </p>
        <button type="button" onclick={() => doc.openFilePicker()}>Importar imagen</button>
      </div>
    {/if}

    {#if doc.isDragging}
      <div class="drop-overlay">Suelta la imagen aquí</div>
    {/if}
  </div>

  <div class="preview-toolbar">
    <div class="toolbar-group" role="group" aria-label="Vista de la imagen">
      <span class="toolbar-label">Vista</span>
      <button
        type="button"
        class:active={editor.previewView === 'result'}
        aria-pressed={editor.previewView === 'result'}
        onclick={() => (editor.previewView = 'result')}
      >
        Resultado
      </button>
      <button
        type="button"
        class:active={editor.previewView === 'original'}
        aria-pressed={editor.previewView === 'original'}
        onclick={() => (editor.previewView = 'original')}
      >
        Original
      </button>
      <button
        type="button"
        class:active={editor.previewView === 'compare'}
        aria-pressed={editor.previewView === 'compare'}
        onclick={() => (editor.previewView = 'compare')}
      >
        Comparar
      </button>
      <button
        type="button"
        class:active={editor.previewView === 'mask'}
        aria-pressed={editor.previewView === 'mask'}
        onclick={() => (editor.previewView = 'mask')}
      >
        Máscara
      </button>
      <button
        type="button"
        class:active={editor.previewView === 'underbase'}
        aria-pressed={editor.previewView === 'underbase'}
        onclick={() => (editor.previewView = 'underbase')}
      >
        Blanco
      </button>
    </div>

    <div class="toolbar-group scale-group" role="group" aria-label="Escala de la vista previa">
      <span class="toolbar-label">Escala</span>
      <button
        type="button"
        class:active={editor.previewMode === 'fit'}
        aria-pressed={editor.previewMode === 'fit'}
        onclick={() => (editor.previewMode = 'fit')}
      >
        Ajustar
      </button>
      <button
        type="button"
        class:active={editor.previewMode === 'actual'}
        aria-pressed={editor.previewMode === 'actual'}
        onclick={() => (editor.previewMode = 'actual')}
      >
        100 %
      </button>
    </div>
  </div>
</div>

<style>
  .preview {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    min-height: 0;
    flex: 1;
  }

  .canvas-area {
    position: relative;
    flex: 1;
    min-height: 240px;
    border: 1px solid #24262d;
    border-radius: 10px;
    overflow: hidden;
    background-color: var(--shirt-color, #15171c);
  }

  .canvas-area.dragging {
    border-color: #f0b45f;
  }

  .canvas-area.actual {
    overflow: auto;
    overscroll-behavior: contain;
  }

  .drop-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: grid;
    place-items: center;
    border: 2px dashed #f0b45f;
    border-radius: 10px;
    background: rgba(10, 11, 14, 0.82);
    color: #f5f0e8;
    font: 600 0.95rem/1.4 system-ui, sans-serif;
    pointer-events: none;
  }

  .load-error {
    display: grid;
    place-items: center;
    min-height: 320px;
    margin: 0;
    padding: 2rem;
    text-align: center;
    font: 0.9rem/1.5 system-ui, sans-serif;
    color: #ffb4a8;
  }

  .empty {
    display: grid;
    place-items: center;
    gap: 0.75rem;
    min-height: 320px;
    padding: 2rem;
    text-align: center;
  }

  .empty-title {
    margin: 0;
    font: 600 1rem/1.3 system-ui, sans-serif;
    color: #f5f0e8;
  }

  .empty-text {
    margin: 0;
    max-width: 34ch;
    font: 0.85rem/1.5 system-ui, sans-serif;
    color: #8b857c;
  }

  .empty button {
    padding: 0.55rem 0.85rem;
    border: 1px solid #f0b45f;
    border-radius: 8px;
    background: #f0b45f;
    color: #18110a;
    font: 600 0.82rem/1.2 system-ui, sans-serif;
    cursor: pointer;
  }

  .preview-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.75rem;
    font: 0.74rem/1.3 ui-monospace, monospace;
    color: #8b857c;
  }

  .toolbar-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
    min-width: 0;
  }

  .toolbar-group.scale-group {
    margin-left: auto;
  }

  .toolbar-label {
    margin-right: 0.15rem;
    color: #6f6a63;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .toolbar-group button {
    padding: 0.32rem 0.55rem;
    border: 1px solid #24262d;
    border-radius: 6px;
    background: #121419;
    color: #a8a29a;
    font: inherit;
    white-space: nowrap;
    cursor: pointer;
  }

  .toolbar-group button.active {
    border-color: #f0b45f;
    color: #f0b45f;
  }

  .toolbar-group button:focus-visible {
    outline: 2px solid #f0b45f;
    outline-offset: 2px;
  }
</style>
