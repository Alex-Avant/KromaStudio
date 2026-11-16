<script lang="ts">
  import { HALFTONE_DEFAULTS } from '../../utils/settings';
  import { clampNumberInput, handlePercentInput } from '../../utils/inputs';
  import type { DocumentState } from '../../state/document.svelte';
  import type { EditorState } from '../../state/editor.svelte';

  interface Props {
    editor: EditorState;
    doc: DocumentState;
  }

  let { editor, doc }: Props = $props();

  const SHIRT_PRESETS = [
    { label: 'Negro', color: '#111111' },
    { label: 'Blanco', color: '#ffffff' },
    { label: 'Gris', color: '#808080' },
  ] as const;

  function setShirtColor(color: string): void {
    editor.shirtColor = color;
    editor.customShirtColor = color;
  }

  function handleCustomColor(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    editor.customShirtColor = input.value;
    setShirtColor(input.value);
  }

  const onFileChange = (event: Event) => doc.handleFileChange(event);
</script>

<div class="panel">
  <section class="group" id="panel-imagen">
    <h2 class="group-title">Imagen</h2>

    <input
      bind:this={doc.fileInput}
      type="file"
      accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
      onchange={onFileChange}
      hidden
    />

    <div class="row">
      <button type="button" class="primary" onclick={() => doc.openFilePicker()}>
        Importar
      </button>
      <button type="button" class="ghost" onclick={() => doc.useDemo()} disabled={!doc.demoBitmap}>
        Demo
      </button>
    </div>

    <p class="file-name" title={doc.selectedName}>{doc.selectedName}</p>
    {#if doc.fileError}
      <p class="error" role="alert">{doc.fileError}</p>
    {/if}
    <p class="hint">PNG, JPG o WebP. Todo se procesa localmente.</p>
  </section>

  <section class="group" id="panel-trama">
    <h2 class="group-title">Trama</h2>

    <label>
      <span>Forma de punto</span>
      <select bind:value={editor.dotShape}>
        <option value="circle">Círculo</option>
        <option value="ellipse">Elipse</option>
        <option value="diamond">Diamante</option>
        <option value="square">Cuadrado</option>
        <option value="line">Línea</option>
      </select>
    </label>

    <label>
      <span>
        LPI
        <input
          class="number-input"
          type="number"
          min="10"
          max="120"
          step="1"
          bind:value={editor.lpi}
          onchange={(event) =>
            clampNumberInput(event, (value) => (editor.lpi = value), 10, 120, HALFTONE_DEFAULTS.lpi)}
          aria-label="LPI exacto"
        />
      </span>
      <input type="range" min="10" max="120" step="1" bind:value={editor.lpi} />
    </label>

    <div class="presets" role="group" aria-label="Presets de LPI">
      {#each [25, 35, 45] as value}
        <button
          type="button"
          class:active={editor.lpi === value}
          onclick={() => (editor.lpi = value)}
        >
          {value}
        </button>
      {/each}
    </div>

    <label>
      <span>
        Ángulo
        <input
          class="number-input"
          type="number"
          min="0"
          max="180"
          step="0.5"
          bind:value={editor.angle}
          onchange={(event) =>
            clampNumberInput(event, (value) => (editor.angle = value), 0, 180, HALFTONE_DEFAULTS.angle)}
          aria-label="Ángulo exacto en grados"
        />
      </span>
      <input type="range" min="0" max="180" step="0.5" bind:value={editor.angle} />
    </label>

    <div class="presets" role="group" aria-label="Presets de ángulo">
      {#each [22.5, 45] as value}
        <button
          type="button"
          class:active={editor.angle === value}
          onclick={() => (editor.angle = value)}
        >
          {value}°
        </button>
      {/each}
    </div>

    <label>
      <span>
        Contraste
        <input
          class="number-input"
          type="number"
          min="0.5"
          max="2.5"
          step="0.05"
          bind:value={editor.contrast}
          onchange={(event) =>
            clampNumberInput(
              event,
              (value) => (editor.contrast = value),
              0.5,
              2.5,
              HALFTONE_DEFAULTS.contrast,
            )}
          aria-label="Contraste exacto"
        />
      </span>
      <input type="range" min="0.5" max="2.5" step="0.05" bind:value={editor.contrast} />
    </label>

    <label>
      <span>
        DPI de salida
        <input
          class="number-input"
          type="number"
          min="72"
          max="600"
          step="1"
          bind:value={editor.dpi}
          onchange={(event) =>
            clampNumberInput(event, (value) => (editor.dpi = value), 72, 600, HALFTONE_DEFAULTS.dpi)}
          aria-label="DPI de salida exacto"
        />
      </span>
      <input type="range" min="72" max="600" step="1" bind:value={editor.dpi} />
    </label>

    <p class="hint">Pitch lógico: {editor.cellPitch.toFixed(2)} px por celda.</p>
    {#if editor.cellPitch < 1}
      <p class="error" role="alert">
        Esta combinación no se puede exportar: necesita menos de un píxel por celda.
        Sube los DPI o baja los LPI.
      </p>
    {:else if editor.cellPitch < 2}
      <p class="hint">
        Menos de dos píxeles por celda: el preview mostrará cobertura media y la
        exportación puede perder definición.
      </p>
    {/if}
  </section>

  <section class="group" id="panel-tonal">
    <h2 class="group-title">Ajustes tonales</h2>

    <label>
      <span>Modo de color</span>
      <select bind:value={editor.colorMode}>
        <option value="color">Color Original</option>
        <option value="mono">Blanco y Negro (Monocromo)</option>
      </select>
    </label>

    <label>
      <span>Polaridad tonal</span>
      <select bind:value={editor.polarity}>
        <option value="light">Luces imprimen</option>
        <option value="dark">Sombras imprimen</option>
      </select>
    </label>

    <label>
      <span>
        Compensación tonal
        <input
          class="number-input"
          type="number"
          min="0.4"
          max="2.5"
          step="0.05"
          bind:value={editor.gamma}
          onchange={(event) =>
            clampNumberInput(event, (value) => (editor.gamma = value), 0.4, 2.5, HALFTONE_DEFAULTS.gamma)}
          aria-label="Compensación tonal exacta"
        />
      </span>
      <input type="range" min="0.4" max="2.5" step="0.05" bind:value={editor.gamma} />
    </label>

    <label>
      <span>
        Punto mínimo (%)
        <input
          class="number-input"
          type="number"
          min="0"
          max="20"
          step="0.5"
          value={(editor.minDot * 100).toFixed(1)}
          oninput={(event) =>
            handlePercentInput(event, (value) => (editor.minDot = value), 0.2)}
          aria-label="Punto mínimo en porcentaje"
        />
      </span>
      <input type="range" min="0" max="0.2" step="0.005" bind:value={editor.minDot} />
    </label>

    <label>
      <span>
        Sombras sólidas (%)
        <input
          class="number-input"
          type="number"
          min="80"
          max="100"
          step="1"
          value={(editor.shadowPoint * 100).toFixed(0)}
          oninput={(event) =>
            handlePercentInput(event, (value) => (editor.shadowPoint = value), 1, 0.8)}
          aria-label="Sombras sólidas en porcentaje"
        />
      </span>
      <input type="range" min="0.8" max="1" step="0.01" bind:value={editor.shadowPoint} />
    </label>

    <label>
      <span>
        Nivel de Negro (%)
        <input
          class="number-input"
          type="number"
          min="0"
          max="90"
          step="1"
          value={(editor.blackPoint * 100).toFixed(0)}
          oninput={(event) =>
            handlePercentInput(event, (value) => (editor.blackPoint = value), 0.9)}
          aria-label="Nivel de negro en porcentaje"
        />
      </span>
      <input type="range" min="0" max="0.9" step="0.01" bind:value={editor.blackPoint} />
    </label>

    <label>
      <span>
        Nivel de Blanco (%)
        <input
          class="number-input"
          type="number"
          min={Math.max(1, (editor.blackPoint + 0.01) * 100).toFixed(0)}
          max="100"
          step="1"
          value={(editor.safeWhitePoint * 100).toFixed(0)}
          oninput={(event) =>
            handlePercentInput(
              event,
              (value) => (editor.whitePoint = value),
              1,
              Math.max(0.1, editor.blackPoint + 0.01),
            )}
          aria-label="Nivel de blanco en porcentaje"
        />
      </span>
      <input
        type="range"
        min={Math.max(0.1, editor.blackPoint + 0.01).toFixed(2)}
        max="1"
        step="0.01"
        bind:value={editor.whitePoint}
      />
    </label>

    <p class="hint">
      La polaridad decide si la tinta corresponde a las luces (referencia Photoshop)
      o a las sombras. El nivel de negro recorta el fondo oscuro.
    </p>
  </section>

  <section class="group" id="panel-base">
    <h2 class="group-title">Base blanca</h2>

    <label class="switch">
      <input type="checkbox" bind:checked={editor.underbase} />
      <span>Underbase activo</span>
    </label>

    <label>
      <span>Tipo de base</span>
      <select bind:value={editor.underbaseStyle} disabled={!editor.underbase}>
        <option value="dot">Tramada (puntos)</option>
        <option value="solid">Sólida</option>
      </select>
    </label>

    <label class="switch">
      <input type="checkbox" bind:checked={editor.showUnderbase} disabled={!editor.underbase} />
      <span>Mostrar underbase en el resultado</span>
    </label>

    <label>
      <span>
        Choke (px)
        <input
          class="number-input"
          type="number"
          min="0"
          max="3"
          step="0.5"
          bind:value={editor.choke}
          onchange={(event) =>
            clampNumberInput(event, (value) => (editor.choke = value), 0, 3, HALFTONE_DEFAULTS.choke)}
          disabled={!editor.underbase}
          aria-label="Choke exacto en píxeles"
        />
      </span>
      <input
        type="range"
        min="0"
        max="3"
        step="0.5"
        bind:value={editor.choke}
        disabled={!editor.underbase}
      />
    </label>

    <p class="hint">
      El underbase solo se genera bajo tinta visible y se erosiona con el choke.
      La base tramada replica los puntos de color; la sólida cubre toda el área
      imprimible.
    </p>
  </section>

  <section class="group" id="panel-camiseta">
    <h2 class="group-title">Camiseta</h2>

    <div class="shirt-presets" role="group" aria-label="Color de camiseta">
      {#each SHIRT_PRESETS as preset}
        <button
          type="button"
          class="shirt-swatch"
          class:active={editor.shirtColor === preset.color}
          style={`--swatch: ${preset.color};`}
          aria-pressed={editor.shirtColor === preset.color}
          onclick={() => setShirtColor(preset.color)}
        >
          <span class="swatch-dot" aria-hidden="true"></span>
          {preset.label}
        </button>
      {/each}
    </div>

    <label class="color-picker">
      <span>Color personalizado</span>
      <input
        type="color"
        value={editor.customShirtColor}
        oninput={handleCustomColor}
      />
    </label>
  </section>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.9rem 0;
    border-bottom: 1px solid #1d1f25;
  }

  .group:last-child {
    border-bottom: 0;
  }

  .group-title {
    margin: 0;
    font: 600 0.72rem/1.2 ui-monospace, monospace;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #f0b45f;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font: 0.82rem/1.3 system-ui, sans-serif;
    color: #cfc9bf;
  }

  label > span {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .number-input {
    width: 4.5rem;
    padding: 0.2rem 0.35rem;
    border: 1px solid #24262d;
    border-radius: 5px;
    background: #0f1115;
    color: #f5f0e8;
    font: 0.75rem/1.2 ui-monospace, monospace;
    text-align: right;
  }

  .number-input:focus-visible {
    outline: 2px solid #f0b45f;
    outline-offset: 2px;
  }

  .number-input:disabled {
    opacity: 0.4;
  }

  input[type='range'] {
    width: 100%;
    accent-color: #f0b45f;
  }

  input[type='range']:disabled {
    opacity: 0.35;
  }

  select {
    width: 100%;
    padding: 0.45rem 0.55rem;
    border: 1px solid #24262d;
    border-radius: 7px;
    background: #0f1115;
    color: #f5f0e8;
    font: 0.8rem/1.2 system-ui, sans-serif;
    cursor: pointer;
  }

  select:focus-visible {
    outline: 2px solid #f0b45f;
    outline-offset: 2px;
  }

  .switch {
    flex-direction: row;
    align-items: center;
    gap: 0.55rem;
  }

  .switch input {
    width: 0.95rem;
    height: 0.95rem;
    accent-color: #f0b45f;
  }

  .switch input:disabled {
    opacity: 0.4;
  }

  .row {
    display: flex;
    gap: 0.45rem;
  }

  .row button {
    flex: 1 1 0;
    padding: 0.5rem 0.6rem;
    border-radius: 7px;
    font: 600 0.78rem/1.2 system-ui, sans-serif;
    cursor: pointer;
  }

  .primary {
    border: 1px solid #f0b45f;
    background: #f0b45f;
    color: #18110a;
  }

  .ghost {
    border: 1px solid #2a2c33;
    background: transparent;
    color: #a8a29a;
  }

  .row button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .presets button {
    padding: 0.2rem 0.5rem;
    border: 1px solid #24262d;
    border-radius: 5px;
    background: #121419;
    color: #a8a29a;
    font: 0.7rem/1.2 ui-monospace, monospace;
    cursor: pointer;
  }

  .presets button.active {
    border-color: #f0b45f;
    color: #f0b45f;
  }

  .shirt-presets {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .shirt-swatch {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0.45rem 0.35rem;
    border: 1px solid #24262d;
    border-radius: 7px;
    background: #0f1115;
    color: #cfc9bf;
    font: 0.75rem/1.2 system-ui, sans-serif;
    cursor: pointer;
  }

  .shirt-swatch.active {
    border-color: #f0b45f;
    color: #f5f0e8;
  }

  .swatch-dot {
    width: 0.8rem;
    height: 0.8rem;
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: 50%;
    background: var(--swatch);
  }

  .color-picker {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .color-picker input[type='color'] {
    width: 2.4rem;
    height: 1.8rem;
    padding: 0;
    border: 1px solid #24262d;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
  }

  .file-name {
    overflow: hidden;
    margin: 0;
    font: 0.75rem/1.4 ui-monospace, monospace;
    color: #cfc9bf;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hint {
    margin: 0;
    font: 0.75rem/1.5 system-ui, sans-serif;
    color: #7f7a73;
  }

  .error {
    margin: 0;
    font: 0.78rem/1.4 system-ui, sans-serif;
    color: #ffb4a8;
  }
</style>
