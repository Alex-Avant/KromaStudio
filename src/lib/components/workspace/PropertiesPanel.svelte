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
  <details class="group" id="panel-imagen" open>
    <summary class="group-title">Imagen <span class="chevron" aria-hidden="true"></span></summary>

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
  </details>

  <details class="group" id="panel-trama" open>
    <summary class="group-title">Halftone <span class="chevron" aria-hidden="true"></span></summary>

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
  </details>

  <details class="group" id="panel-tonal">
    <summary class="group-title">Ajustes tonales <span class="chevron" aria-hidden="true"></span></summary>

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
  </details>

  <details class="group" id="panel-base">
    <summary class="group-title">Base blanca <span class="chevron" aria-hidden="true"></span></summary>

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
  </details>

  <details class="group" id="panel-separaciones">
    <summary class="group-title">Separaciones <span class="chevron" aria-hidden="true"></span></summary>

    <p class="hint">Inspecciona cada vista antes de preparar las placas PNG.</p>
    <div class="separation-grid" role="group" aria-label="Vistas y separaciones">
      {#each [
        { id: 'result', label: 'Resultado', detail: 'Color + blanco' },
        { id: 'original', label: 'Original', detail: 'Imagen fuente' },
        { id: 'compare', label: 'Comparar', detail: 'Antes / después' },
        { id: 'mask', label: 'Máscara', detail: 'Tinta en gris' },
        { id: 'underbase', label: 'Base blanca', detail: 'Placa de blanco' },
      ] as view}
        <button
          type="button"
          class:active={editor.previewView === view.id}
          aria-pressed={editor.previewView === view.id}
          onclick={() => (editor.previewView = view.id as typeof editor.previewView)}
        >
          <span>{view.label}</span>
          <small>{view.detail}</small>
        </button>
      {/each}
    </div>
  </details>

  <details class="group" id="panel-camiseta">
    <summary class="group-title">Camiseta <span class="chevron" aria-hidden="true"></span></summary>

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
  </details>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.15rem 0.8rem 0.8rem;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: color-mix(in srgb, var(--surface-2) 45%, var(--surface));
    scroll-margin-block: 0.75rem;
  }

  .group[open] {
    padding-bottom: 0.85rem;
  }

  .group-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.7rem;
    min-height: 46px;
    margin: 0 -0.8rem;
    padding: 0.65rem 0.8rem;
    border-radius: 11px;
    color: var(--text);
    font-size: 0.79rem;
    font-weight: 650;
    letter-spacing: 0.005em;
    cursor: pointer;
    list-style: none;
    user-select: none;
  }

  .group-title::-webkit-details-marker {
    display: none;
  }

  .group-title:hover {
    background: color-mix(in srgb, var(--surface-3) 60%, transparent);
  }

  .chevron {
    width: 8px;
    height: 8px;
    flex: 0 0 8px;
    border-right: 1.5px solid var(--muted);
    border-bottom: 1.5px solid var(--muted);
    transform: rotate(45deg) translateY(-2px);
    transition: transform 150ms ease;
  }

  .group[open] > .group-title .chevron {
    transform: rotate(225deg) translate(-1px, -1px);
  }

  .group-title:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    color: var(--text-2);
    font-size: 0.8rem;
    line-height: 1.35;
  }

  label > span {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .number-input {
    width: 4.6rem;
    min-height: 36px;
    padding: 0.25rem 0.4rem;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--bg);
    color: var(--text);
    font: 0.75rem/1.2 var(--mono);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .number-input:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
  }

  .number-input:disabled {
    opacity: 0.42;
  }

  input[type='range'] {
    width: 100%;
    height: 44px;
    margin: 0;
    accent-color: var(--primary);
    cursor: pointer;
  }

  input[type='range']:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  select {
    width: 100%;
    min-height: 44px;
    padding: 0.5rem 0.65rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font-family: inherit;
    font-size: 0.79rem;
    line-height: 1.2;
    cursor: pointer;
  }

  .switch {
    flex-direction: row;
    align-items: center;
    gap: 0.65rem;
    min-height: 44px;
  }

  .switch input {
    width: 1.1rem;
    height: 1.1rem;
    flex: 0 0 1.1rem;
    accent-color: var(--primary);
  }

  .switch input:disabled {
    opacity: 0.4;
  }

  .row {
    display: flex;
    gap: 0.5rem;
  }

  .row button {
    min-height: 44px;
    flex: 1 1 0;
    padding: 0.55rem 0.6rem;
    border-radius: 8px;
    font-family: inherit;
    font-size: 0.78rem;
    font-weight: 650;
    line-height: 1.2;
    cursor: pointer;
  }

  .primary {
    border: 1px solid var(--primary);
    background: var(--primary);
    color: var(--primary-ink);
  }

  .primary:hover {
    background: #7546e8;
  }

  .ghost {
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text);
  }

  .ghost:hover {
    border-color: var(--primary-text);
  }

  .row button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .presets button {
    min-width: 44px;
    min-height: 38px;
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--surface);
    color: var(--text-2);
    font: 0.7rem/1.2 var(--mono);
    cursor: pointer;
  }

  .presets button.active {
    border-color: var(--primary-text);
    background: color-mix(in srgb, var(--primary) 18%, var(--surface));
    color: var(--primary-text);
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
    min-height: 44px;
    padding: 0.4rem 0.25rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text-2);
    font-family: inherit;
    font-size: 0.72rem;
    line-height: 1.2;
    cursor: pointer;
  }

  .shirt-swatch.active {
    border-color: var(--primary-text);
    color: var(--text);
  }

  .swatch-dot {
    width: 0.8rem;
    height: 0.8rem;
    border: 1px solid rgb(255 255 255 / 32%);
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
    width: 48px;
    height: 44px;
    padding: 3px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface-2);
    cursor: pointer;
  }

  .file-name {
    overflow: hidden;
    margin: 0;
    color: var(--text);
    font: 0.73rem/1.4 var(--mono);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hint {
    margin: 0;
    color: var(--muted);
    font-size: 0.74rem;
    line-height: 1.5;
  }

  .error {
    margin: 0;
    color: var(--error);
    font-size: 0.78rem;
    line-height: 1.4;
  }

  .separation-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
  }

  .separation-grid button {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 0.25rem;
    min-height: 58px;
    padding: 0.55rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--bg);
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }

  .separation-grid button.active {
    border-color: var(--primary-text);
    background: color-mix(in srgb, var(--primary) 17%, var(--surface));
  }

  .separation-grid button span {
    font-size: 0.73rem;
    font-weight: 650;
  }

  .separation-grid button small {
    color: var(--muted);
    font-size: 0.61rem;
  }

  .separation-grid button:focus-visible,
  .presets button:focus-visible,
  .row button:focus-visible,
  .shirt-swatch:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
  }

  @media (max-width: 880px) {
    .panel {
      gap: 0.45rem;
    }

    .group {
      gap: 0.7rem;
    }

    .group-title {
      min-height: 48px;
    }

    .number-input,
    .presets button {
      min-height: 44px;
    }
  }
</style>
