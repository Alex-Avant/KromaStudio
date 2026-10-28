<script lang="ts">
  import { onMount } from 'svelte';
  import { HalftoneCanvas, type HalftoneImageSource } from './lib';
  import { createDemoImage } from './lib/utils/demo-image';

  const FILE_ACCEPT = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';
  const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

  // Parámetros reactivos del motor.
  let lpi = $state(45);
  let angle = $state(45);
  let contrast = $state(1);
  let dpi = $state(300);
  let underbase = $state(true);
  let choke = $state(1);

  // La fuente puede ser la demo generada o un archivo local.
  let source = $state<HalftoneImageSource | null>(null);
  let demoBitmap = $state<ImageBitmap | null>(null);
  let selectedName = $state('Demo generada');
  let error = $state<string | null>(null);
  let fileError = $state<string | null>(null);
  let isDragging = $state(false);
  let fileInput: HTMLInputElement | null = null;

  onMount(() => {
    let disposed = false;

    createDemoImage(1024)
      .then((bitmap) => {
        if (disposed) {
          bitmap.close();
          return;
        }

        demoBitmap = bitmap;
        // No pisa un archivo elegido mientras se generaba la demo.
        if (!source) source = bitmap;
      })
      .catch((cause) => {
        if (!disposed && !source) {
          error = cause instanceof Error ? cause.message : 'No se pudo generar la imagen de prueba.';
        }
      });

    return () => {
      disposed = true;
      demoBitmap?.close();
    };
  });

  function openFilePicker() {
    fileInput?.click();
  }

  function useDemo() {
    if (!demoBitmap) return;

    fileError = null;
    selectedName = 'Demo generada';
    source = demoBitmap;
  }

  function isSupportedFile(file: File): boolean {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    return (
      SUPPORTED_MIME_TYPES.includes(file.type.toLowerCase()) ||
      SUPPORTED_EXTENSIONS.includes(extension)
    );
  }

  function selectFile(file: File | undefined) {
    fileError = null;
    if (!file) return;

    if (file.size === 0) {
      fileError = 'El archivo está vacío.';
      return;
    }

    if (!isSupportedFile(file)) {
      fileError = 'Formato no compatible. Usa PNG, JPG o WebP.';
      return;
    }

    selectedName = file.name;
    source = file;
  }

  function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    selectFile(input.files?.[0]);
    // Permite volver a seleccionar el mismo archivo.
    input.value = '';
  }

  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  function handleDragLeave(event: DragEvent) {
    const container = event.currentTarget as HTMLElement;
    if (!container.contains(event.relatedTarget as Node | null)) {
      isDragging = false;
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    selectFile(event.dataTransfer?.files[0]);
  }
</script>

<svelte:head>
  <title>KromaStudio — DTF Halftone Lab</title>
  <meta
    name="description"
    content="Prototipo local-first de semitono B/N y underbase con choke para impresión DTF."
  />
</svelte:head>

<main class="app">
  <header class="hero">
    <p class="eyebrow">KromaStudio · WebGPU</p>
    <h1>DTF Halftone Lab</h1>
    <p class="lede">
      Semitono negro y underbase blanco con choke, renderizados en tiempo real
      con Svelte 5 y WebGPU.
    </p>
  </header>

  <section class="workspace">
    <div class="preview-panel">
      <div
        class="checkerboard"
        class:dragging={isDragging}
        role="region"
        aria-label="Vista previa y zona para soltar imágenes"
        ondragenter={handleDragEnter}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
      >
        {#if error && !source}
          <p class="load-error">{error}</p>
        {:else if source}
          <HalftoneCanvas
            src={source}
            {lpi}
            {angle}
            {contrast}
            {dpi}
            {underbase}
            {choke}
          />
        {:else}
          <p class="loading">Generando imagen de prueba…</p>
        {/if}

        {#if isDragging}
          <div class="drop-overlay">Suelta la imagen aquí</div>
        {/if}
      </div>
      <p class="preview-note">
        El damero muestra las zonas transparentes. El blanco es la capa de
        underbase; los puntos negros, la capa de color. También puedes arrastrar
        una imagen sobre la vista previa.
      </p>
    </div>

    <aside class="controls" aria-label="Parámetros de semitono y underbase">
      <fieldset>
        <legend>Imagen</legend>

        <input
          bind:this={fileInput}
          type="file"
          accept={FILE_ACCEPT}
          onchange={handleFileChange}
          hidden
        />

        <div class="file-actions">
          <button type="button" onclick={openFilePicker}>Seleccionar imagen</button>
          <button type="button" class="secondary" onclick={useDemo} disabled={!demoBitmap}>
            Usar demo
          </button>
        </div>

        <p class="file-name" title={selectedName}>{selectedName}</p>
        {#if fileError}
          <p class="file-error" role="alert">{fileError}</p>
        {/if}
        <p class="hint">
          PNG, JPG o WebP. El archivo se procesa localmente y no se sube a ningún servidor.
        </p>
      </fieldset>

      <fieldset>
        <legend>Trama</legend>

        <label>
          <span>LPI <output>{lpi}</output></span>
          <input type="range" min="10" max="120" step="1" bind:value={lpi} />
        </label>

        <label>
          <span>Ángulo <output>{angle}°</output></span>
          <input type="range" min="0" max="180" step="1" bind:value={angle} />
        </label>

        <label>
          <span>Contraste <output>{contrast.toFixed(2)}</output></span>
          <input type="range" min="0.5" max="2.5" step="0.05" bind:value={contrast} />
        </label>

        <label>
          <span>DPI de salida <output>{dpi}</output></span>
          <input type="range" min="72" max="600" step="1" bind:value={dpi} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Underbase</legend>

        <label class="switch">
          <input type="checkbox" bind:checked={underbase} />
          <span>Activar underbase blanco</span>
        </label>

        <label>
          <span>Choke <output>{choke} px</output></span>
          <input
            type="range"
            min="0"
            max="2"
            step="1"
            bind:value={choke}
            disabled={!underbase}
          />
        </label>

        <p class="hint">
          El choke erosiona la máscara alfa del underbase para que el blanco no
          asome en los bordes del diseño.
        </p>
      </fieldset>

      <div class="badge">local-first · sin subir archivos</div>
    </aside>
  </section>
</main>

<style>
  .app {
    width: min(1180px, 100%);
    margin: 0 auto;
    padding: clamp(1.25rem, 4vw, 3rem);
  }

  .hero {
    max-width: 760px;
    margin-bottom: clamp(1.5rem, 4vw, 3rem);
  }

  .eyebrow {
    margin: 0 0 0.65rem;
    font: 600 0.78rem/1.2 ui-monospace, monospace;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #f0b45f;
  }

  h1 {
    margin: 0;
    font: 700 clamp(2.4rem, 7vw, 5.2rem) / 0.95 system-ui, sans-serif;
    letter-spacing: -0.055em;
    color: #f5f0e8;
  }

  .lede {
    max-width: 58ch;
    margin: 1rem 0 0;
    font: 1rem/1.55 system-ui, sans-serif;
    color: #a8a29a;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: clamp(1.25rem, 3vw, 2.5rem);
    align-items: start;
  }

  .preview-panel {
    min-width: 0;
  }

  .checkerboard {
    position: relative;
    width: 100%;
    border: 1px solid #2a2c33;
    border-radius: 18px;
    overflow: hidden;
    background-color: #15171c;
    background-image:
      linear-gradient(45deg, #1d2027 25%, transparent 25%),
      linear-gradient(-45deg, #1d2027 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #1d2027 75%),
      linear-gradient(-45deg, transparent 75%, #1d2027 75%);
    background-size: 22px 22px;
    background-position:
      0 0,
      0 11px,
      11px -11px,
      -11px 0;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
  }

  .checkerboard.dragging {
    border-color: #f0b45f;
  }

  .drop-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: grid;
    place-items: center;
    border: 2px dashed #f0b45f;
    border-radius: 18px;
    background: rgba(10, 11, 14, 0.82);
    color: #f5f0e8;
    font: 600 1rem/1.4 system-ui, sans-serif;
    pointer-events: none;
  }

  .loading,
  .load-error {
    display: grid;
    place-items: center;
    min-height: 420px;
    margin: 0;
    padding: 2rem;
    text-align: center;
    font: 0.95rem/1.5 system-ui, sans-serif;
    color: #a8a29a;
  }

  .load-error {
    color: #ffb4a8;
  }

  .preview-note {
    margin: 0.9rem 0 0;
    font: 0.82rem/1.5 system-ui, sans-serif;
    color: #7f7a73;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.25rem;
    border: 1px solid #2a2c33;
    border-radius: 18px;
    background: linear-gradient(180deg, #14161b, #101216);
  }

  fieldset {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin: 0;
    padding: 0 0 1rem;
    border: 0;
    border-bottom: 1px solid #24262d;
  }

  fieldset:last-of-type {
    padding-bottom: 0;
    border-bottom: 0;
  }

  legend {
    padding: 0;
    margin-bottom: 0.85rem;
    font: 600 0.78rem/1.2 ui-monospace, monospace;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #f0b45f;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    font: 0.88rem/1.3 system-ui, sans-serif;
    color: #d7d1c7;
  }

  label > span {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  output {
    font-family: ui-monospace, monospace;
    color: #f5f0e8;
  }

  input[type='range'] {
    width: 100%;
    accent-color: #f0b45f;
  }

  input[type='range']:disabled {
    opacity: 0.35;
  }

  .switch {
    flex-direction: row;
    align-items: center;
    gap: 0.65rem;
  }

  .switch input {
    width: 1rem;
    height: 1rem;
    accent-color: #f0b45f;
  }

  .file-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .file-actions button {
    flex: 1 1 120px;
    padding: 0.65rem 0.75rem;
    border: 1px solid #f0b45f;
    border-radius: 10px;
    background: #f0b45f;
    color: #18110a;
    font: 600 0.82rem/1.2 system-ui, sans-serif;
    cursor: pointer;
  }

  .file-actions button.secondary {
    border-color: #4a3b28;
    background: transparent;
    color: #f0b45f;
  }

  .file-actions button:hover:not(:disabled) {
    filter: brightness(1.08);
  }

  .file-actions button:focus-visible {
    outline: 2px solid #f0b45f;
    outline-offset: 2px;
  }

  .file-actions button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .file-name {
    overflow: hidden;
    margin: 0;
    font: 0.78rem/1.4 ui-monospace, monospace;
    color: #d7d1c7;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-error {
    margin: 0;
    font: 0.8rem/1.4 system-ui, sans-serif;
    color: #ffb4a8;
  }

  .hint {
    margin: 0;
    font: 0.78rem/1.5 system-ui, sans-serif;
    color: #7f7a73;
  }

  .badge {
    align-self: flex-start;
    padding: 0.35rem 0.6rem;
    border: 1px solid #2a2c33;
    border-radius: 999px;
    font: 0.7rem/1 ui-monospace, monospace;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #7f7a73;
  }

  @media (max-width: 880px) {
    .workspace {
      grid-template-columns: 1fr;
    }
  }
</style>
