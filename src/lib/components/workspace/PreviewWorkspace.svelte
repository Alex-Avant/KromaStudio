<script lang="ts">
  import { onMount } from 'svelte';
  import { HalftoneCanvas } from '../../index';
  import type { HalftoneCanvasHandle } from '../../types/halftone';
  import type { DocumentState } from '../../state/document.svelte';
  import type { EditorState } from '../../state/editor.svelte';

  interface Props {
    editor: EditorState;
    doc: DocumentState;
    outputWidth?: number;
    outputHeight?: number;
    onCanvas?: (handle: HalftoneCanvasHandle | null) => void;
  }

  let { editor, doc, outputWidth, outputHeight, onCanvas }: Props = $props();

  let canvasRef = $state<HalftoneCanvasHandle | null>(null);
  let canvasArea: HTMLDivElement | null = $state(null);
  let fitFrameStyle = $state('');

  function updateFitFrame(): void {
    if (!canvasArea) return;

    const areaWidth = canvasArea.clientWidth;
    const areaHeight = canvasArea.clientHeight;
    if (!areaWidth || !areaHeight) return;

    const imageWidth = outputWidth ?? doc.imageStats?.width ?? areaWidth;
    const imageHeight = outputHeight ?? doc.imageStats?.height ?? areaHeight;
    const scale = Math.min(areaWidth / imageWidth, areaHeight / imageHeight);
    fitFrameStyle = `--fit-width: ${imageWidth * scale}px; --fit-height: ${imageHeight * scale}px;`;
  }

  $effect(() => {
    doc.imageStats?.width;
    doc.imageStats?.height;
    outputWidth;
    outputHeight;
    updateFitFrame();
  });

  onMount(() => {
    if (!canvasArea) return;
    const observer = new ResizeObserver(updateFitFrame);
    observer.observe(canvasArea);
    updateFitFrame();
    return () => observer.disconnect();
  });

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
    bind:this={canvasArea}
    class="canvas-area checkerboard"
    class:dragging={doc.isDragging}
    class:actual={editor.previewMode === 'actual'}
    class:background-checker={editor.previewBackground === 'checkerboard'}
    class:background-black={editor.previewBackground === 'black'}
    class:background-white={editor.previewBackground === 'white'}
    style={`--shirt-color: ${editor.shirtColor}; ${fitFrameStyle}`}
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
        brightness={editor.brightness}
        contrast={editor.contrast}
        gamma={editor.gamma}
        minDot={editor.minDot}
        maxDot={editor.maxDot}
        solidThreshold={editor.solidThreshold}
        solidEnabled={editor.solidEnabled}
        edgeSmooth={editor.edgeSmooth}
        edgeProtect={editor.edgeProtect}
        applicationMode={editor.applicationMode}
        dotShape={editor.dotShape}
        dpi={editor.dpi}
        underbase={editor.underbase}
        choke={editor.choke}
        spread={editor.spread}
        underbaseStyle={editor.underbaseStyle}
        colorMode={editor.colorMode}
        polarity={editor.polarity}
        blackPoint={editor.blackPoint}
        whitePoint={editor.safeWhitePoint}
        shirtColor={editor.shirtColor}
        showUnderbase={editor.showUnderbase}
        previewMode={editor.previewMode}
        previewView={editor.previewView}
        {outputWidth}
        {outputHeight}
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

  .canvas-area:not(.actual) {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .canvas-area:not(.actual) :global(.halftone-canvas:not(.actual-pan)) {
    width: var(--fit-width, 100%);
    height: var(--fit-height, 100%);
    max-width: 100%;
    max-height: 100%;
    flex: 0 0 auto;
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
  }
</style>
