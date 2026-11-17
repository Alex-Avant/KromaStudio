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
    class:background-checker={editor.previewBackground === 'checkerboard'}
    class:background-black={editor.previewBackground === 'black'}
    class:background-white={editor.previewBackground === 'white'}
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

    <div class="registration-marks" aria-hidden="true">
      <i></i><i></i><i></i><i></i>
    </div>

    {#if doc.isDragging}
      <div class="drop-overlay">Suelta la imagen aquí</div>
    {/if}
  </div>

  <div class="preview-toolbar">
    <div class="toolbar-row">
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

    <label class="background-control">
      <span class="toolbar-label">Fondo</span>
      <select bind:value={editor.previewBackground} aria-label="Fondo de previsualización">
        <option value="checkerboard">Tablero</option>
        <option value="black">Negro</option>
        <option value="white">Blanco</option>
        <option value="shirt">Camiseta</option>
      </select>
    </label>
  </div>
</div>

<style>
  .preview {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    width: 100%;
    min-width: 0;
    min-height: 0;
    flex: 1;
  }

  .canvas-area {
    position: relative;
    flex: 1;
    width: 100%;
    min-width: 0;
    min-height: 240px;
    border: 1px solid var(--border);
    border-radius: 15px;
    overflow: hidden;
    background: var(--shirt-color, #15171c);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 2%), 0 14px 40px rgb(0 0 0 / 20%);
  }

  .canvas-area.background-checker {
    background-color: #171c27;
    background-image: conic-gradient(#222a38 25%, #171c27 0 50%, #222a38 0 75%, #171c27 0);
    background-size: 24px 24px;
  }

  .canvas-area.background-black {
    background: #080a0f;
  }

  .canvas-area.background-white {
    background: #f5f7fb;
  }

  .canvas-area.dragging {
    border-color: var(--cyan);
    box-shadow: inset 0 0 0 1px var(--cyan), 0 0 30px rgb(34 211 238 / 14%);
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
    border: 2px dashed var(--cyan);
    border-radius: 15px;
    background: rgb(16 19 27 / 88%);
    color: var(--text);
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
    color: var(--error);
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
    color: var(--text);
  }

  .empty-text {
    margin: 0;
    max-width: 34ch;
    font: 0.85rem/1.5 system-ui, sans-serif;
    color: var(--muted);
  }

  .empty button {
    padding: 0.55rem 0.85rem;
    min-height: 44px;
    padding-inline: 1rem;
    border: 1px solid var(--primary);
    border-radius: 9px;
    background: var(--primary);
    color: var(--primary-ink);
    font: 600 0.82rem/1.2 system-ui, sans-serif;
    cursor: pointer;
  }

  .preview-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    width: 100%;
    min-width: 0;
    max-width: 100%;
    gap: 0.55rem 1rem;
    padding: 0.5rem 0.15rem 0;
    font: 0.72rem/1.3 var(--mono);
    color: var(--muted);
  }

  .toolbar-row {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem 0.85rem;
  }

  .toolbar-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    min-width: 0;
  }

  .toolbar-group.scale-group {
    margin-left: auto;
  }

  .toolbar-label {
    margin-right: 0.15rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .toolbar-group button {
    min-height: 38px;
    padding: 0.35rem 0.58rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text-2);
    font: inherit;
    white-space: nowrap;
    cursor: pointer;
  }

  .toolbar-group button.active {
    border-color: var(--primary-text);
    background: color-mix(in srgb, var(--primary) 18%, var(--surface));
    color: var(--primary-text);
  }

  .toolbar-group button:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
  }

  .background-control {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }

  .background-control select {
    min-height: 38px;
    padding: 0.35rem 1.75rem 0.35rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font: 0.72rem/1.2 var(--mono);
  }

  .background-control select:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
  }

  .registration-marks {
    position: absolute;
    z-index: 6;
    inset: 13px;
    pointer-events: none;
  }

  .registration-marks i {
    position: absolute;
    width: 15px;
    height: 15px;
    opacity: 0.65;
  }

  .registration-marks i:nth-child(1) {
    top: 0;
    left: 0;
  }

  .registration-marks i:nth-child(2) {
    top: 0;
    right: 0;
  }

  .registration-marks i:nth-child(3) {
    bottom: 0;
    left: 0;
  }

  .registration-marks i:nth-child(4) {
    right: 0;
    bottom: 0;
  }

  .registration-marks i::before,
  .registration-marks i::after {
    position: absolute;
    background: var(--cyan);
    content: '';
    box-shadow: 0 0 6px rgb(34 211 238 / 30%);
  }

  .registration-marks i::before {
    width: 15px;
    height: 1px;
  }

  .registration-marks i::after {
    width: 1px;
    height: 15px;
  }

  .registration-marks i:nth-child(2)::after,
  .registration-marks i:nth-child(4)::after {
    right: 0;
  }

  .registration-marks i:nth-child(3)::before,
  .registration-marks i:nth-child(3)::after,
  .registration-marks i:nth-child(4)::before,
  .registration-marks i:nth-child(4)::after {
    bottom: 0;
  }

  @media (max-width: 520px) {
    .canvas-area {
      min-height: 160px;
      border-radius: 12px;
    }

    .preview-toolbar {
      gap: 0.45rem;
      padding-top: 0.25rem;
      overflow-x: auto;
      flex-wrap: nowrap;
      scrollbar-width: none;
    }

    .preview-toolbar::-webkit-scrollbar {
      display: none;
    }

    .toolbar-row {
      flex: 0 0 auto;
      flex-wrap: nowrap;
      gap: 0.45rem;
    }

    .toolbar-group {
      flex-wrap: nowrap;
    }

    .toolbar-group button,
    .background-control select {
      min-height: 44px;
    }

    .toolbar-group button {
      min-width: 44px;
    }

    .background-control {
      flex: 0 0 auto;
    }
  }
</style>
