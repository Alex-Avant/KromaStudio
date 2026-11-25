<script lang="ts">
  import { HALFTONE_DEFAULTS } from '../../utils/settings';
  import {
    clampNumberInput,
    handlePercentInput,
    rangeProgressPercent,
  } from '../../utils/inputs';
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

  const DOT_SHAPE_LABELS = {
    circle: 'Círculo',
    ellipse: 'Elipse',
    diamond: 'Diamante',
    square: 'Cuadrado',
    line: 'Línea',
  } as const;

  const dimensions = $derived(
    doc.imageStats ? `${doc.imageStats.width} × ${doc.imageStats.height} px` : '—',
  );

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
      <button type="button" class="primary" onclick={() => doc.openFilePicker()}>Importar</button>
      <button type="button" class="ghost" onclick={() => doc.useDemo()} disabled={!doc.demoBitmap}>
        Demo
      </button>
    </div>

    <p class="file-name" title={doc.selectedName}>{doc.selectedName}</p>
    {#if doc.fileError}
      <p class="error" role="alert">{doc.fileError}</p>
    {/if}
    <p class="hint">PNG, JPG o WebP. Todo se procesa localmente.</p>

    <div class="document-info" aria-label="Información de la imagen">
      <div class="info-item">
        <span>Dimensiones</span>
        <strong>{dimensions}</strong>
      </div>
      <div class="info-item">
        <span>DPI original</span>
        <strong class="unavailable" title="El archivo se decodifica a píxeles; no se conserva su metadato DPI.">—</strong>
      </div>
    </div>
    <p class="hint">El tamaño físico se calcula con el DPI de salida en Exportar.</p>

    <div class="subsection">
      <h3>Zoom de previsualización</h3>
      <div class="zoom-buttons" role="group" aria-label="Escala del canvas">
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
      <p class="hint">En 100 %, arrastra sobre el canvas para desplazarte.</p>
    </div>

    <div class="subsection">
      <h3>Fondo de previsualización</h3>
      <label class="select-field" for="preview-background">
        <span>Superficie</span>
        <select id="preview-background" bind:value={editor.previewBackground}>
          <option value="checkerboard">Transparencia · tablero</option>
          <option value="black">Negro</option>
          <option value="white">Blanco</option>
          <option value="shirt">Color de camiseta</option>
        </select>
      </label>
    </div>

    <div class="subsection">
      <h3>Simulación de camiseta</h3>
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
      <label class="color-picker" for="shirt-color">
        <span>Color personalizado</span>
        <input
          id="shirt-color"
          type="color"
          value={editor.customShirtColor}
          oninput={handleCustomColor}
        />
      </label>
    </div>
  </details>

  <details class="group" id="panel-tonal">
    <summary class="group-title">Ajustes <span class="chevron" aria-hidden="true"></span></summary>

    <div class="field">
      <label for="color-mode">Modo de color</label>
      <select id="color-mode" bind:value={editor.colorMode}>
        <option value="color">Color original</option>
        <option value="mono">Blanco y negro (monocromo)</option>
      </select>
    </div>

    <div class="field">
      <div class="field-head">
        <label for="contrast-range">Contraste</label>
        <input
          class="number-input"
          type="number"
          min="0.5"
          max="2.5"
          step="0.05"
          bind:value={editor.contrast}
          onchange={(event) =>
            clampNumberInput(event, (value) => (editor.contrast = value), 0.5, 2.5, HALFTONE_DEFAULTS.contrast)}
          aria-label="Contraste exacto"
        />
      </div>
      <input
        id="contrast-range"
        class="range-control"
        type="range"
        min="0.5"
        max="2.5"
        step="0.05"
        bind:value={editor.contrast}
        aria-valuetext={`${editor.contrast}×`}
        style={`--range-progress: ${rangeProgressPercent(editor.contrast, 0.5, 2.5)}%;`}
      />
    </div>

    <div class="field">
      <div class="field-head">
        <label for="gamma-range">Gamma</label>
        <input
          class="number-input"
          type="number"
          min="0.4"
          max="2.5"
          step="0.05"
          bind:value={editor.gamma}
          onchange={(event) =>
            clampNumberInput(event, (value) => (editor.gamma = value), 0.4, 2.5, HALFTONE_DEFAULTS.gamma)}
          aria-label="Gamma exacto"
        />
      </div>
      <input
        id="gamma-range"
        class="range-control"
        type="range"
        min="0.4"
        max="2.5"
        step="0.05"
        bind:value={editor.gamma}
        aria-valuetext={`${editor.gamma}×`}
        style={`--range-progress: ${rangeProgressPercent(editor.gamma, 0.4, 2.5)}%;`}
      />
    </div>

    <div class="field">
      <div class="field-head">
        <label for="black-point-range">Nivel de negro (%)</label>
        <input
          class="number-input"
          type="number"
          min="0"
          max="90"
          step="1"
          value={(editor.blackPoint * 100).toFixed(0)}
          oninput={(event) => handlePercentInput(event, (value) => (editor.blackPoint = value), 0.9)}
          aria-label="Nivel de negro en porcentaje"
        />
      </div>
      <input
        id="black-point-range"
        class="range-control"
        type="range"
        min="0"
        max="0.9"
        step="0.01"
        bind:value={editor.blackPoint}
        aria-valuetext={`${(editor.blackPoint * 100).toFixed(0)}%`}
        style={`--range-progress: ${rangeProgressPercent(editor.blackPoint, 0, 0.9)}%;`}
      />
    </div>

    <div class="field">
      <div class="field-head">
        <label for="white-point-range">Nivel de blanco (%)</label>
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
      </div>
      <input
        id="white-point-range"
        class="range-control"
        type="range"
        min={Math.max(0.1, editor.blackPoint + 0.01).toFixed(2)}
        max="1"
        step="0.01"
        bind:value={editor.whitePoint}
        aria-valuetext={`${(editor.safeWhitePoint * 100).toFixed(0)}%`}
        style={`--range-progress: ${rangeProgressPercent(editor.safeWhitePoint, Math.max(0.1, editor.blackPoint + 0.01), 1)}%;`}
      />
    </div>

    <p class="hint">El nivel de negro recorta el fondo oscuro; el nivel de blanco remapea el extremo claro.</p>
  </details>

  <details class="group" id="panel-trama" open>
    <summary class="group-title">Halftone <span class="chevron" aria-hidden="true"></span></summary>

    <div class="field">
      <label for="dot-shape">Forma del punto</label>
      <select id="dot-shape" bind:value={editor.dotShape}>
        <option value="circle">Círculo</option>
        <option value="ellipse">Elipse</option>
        <option value="diamond">Diamante</option>
        <option value="square">Cuadrado</option>
        <option value="line">Línea</option>
      </select>
    </div>

    <div class="field">
      <div class="field-head">
        <label for="lpi-range">LPI</label>
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
      </div>
      <input
        id="lpi-range"
        class="range-control"
        type="range"
        min="10"
        max="120"
        step="1"
        bind:value={editor.lpi}
        aria-valuetext={`${editor.lpi} LPI`}
        style={`--range-progress: ${rangeProgressPercent(editor.lpi, 10, 120)}%;`}
      />
      <div class="presets" role="group" aria-label="Presets de LPI">
        {#each [25, 35, 45] as value}
          <button type="button" class:active={editor.lpi === value} aria-pressed={editor.lpi === value} onclick={() => (editor.lpi = value)}>
            {value} LPI
          </button>
        {/each}
      </div>
    </div>

    <div class="field">
      <div class="field-head">
        <label for="angle-range">Ángulo</label>
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
      </div>
      <input
        id="angle-range"
        class="range-control"
        type="range"
        min="0"
        max="180"
        step="0.5"
        bind:value={editor.angle}
        aria-valuetext={`${editor.angle} grados`}
        style={`--range-progress: ${rangeProgressPercent(editor.angle, 0, 180)}%;`}
      />
      <div class="presets" role="group" aria-label="Presets de ángulo">
        {#each [22.5, 45] as value}
          <button type="button" class:active={editor.angle === value} aria-pressed={editor.angle === value} onclick={() => (editor.angle = value)}>
            {value}°
          </button>
        {/each}
      </div>
    </div>

    <div class="field">
      <div class="field-head">
        <label for="min-dot-range">Punto mínimo (%)</label>
        <input
          class="number-input"
          type="number"
          min="0"
          max="20"
          step="0.5"
          value={(editor.minDot * 100).toFixed(1)}
          oninput={(event) => handlePercentInput(event, (value) => (editor.minDot = value), 0.2)}
          aria-label="Punto mínimo en porcentaje"
        />
      </div>
      <input
        id="min-dot-range"
        class="range-control"
        type="range"
        min="0"
        max="0.2"
        step="0.005"
        bind:value={editor.minDot}
        aria-valuetext={`${(editor.minDot * 100).toFixed(1)}%`}
        style={`--range-progress: ${rangeProgressPercent(editor.minDot, 0, 0.2)}%;`}
      />
    </div>

    <div class="field">
      <div class="field-head">
        <label for="coverage-range">Cobertura sólida (%)</label>
        <input
          class="number-input"
          type="number"
          min="80"
          max="100"
          step="1"
          value={(editor.shadowPoint * 100).toFixed(0)}
          oninput={(event) => handlePercentInput(event, (value) => (editor.shadowPoint = value), 1, 0.8)}
          aria-label="Cobertura sólida en porcentaje"
        />
      </div>
      <input
        id="coverage-range"
        class="range-control"
        type="range"
        min="0.8"
        max="1"
        step="0.01"
        bind:value={editor.shadowPoint}
        aria-valuetext={`${(editor.shadowPoint * 100).toFixed(0)}%`}
        style={`--range-progress: ${rangeProgressPercent(editor.shadowPoint, 0.8, 1)}%;`}
      />
    </div>

    <div class="field">
      <label for="polarity">Polaridad</label>
      <select id="polarity" bind:value={editor.polarity}>
        <option value="light">Imprimir luces</option>
        <option value="dark">Imprimir sombras</option>
      </select>
    </div>

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

  <details class="group" id="panel-separaciones">
    <summary class="group-title">Separaciones <span class="chevron" aria-hidden="true"></span></summary>

    <p class="hint">Inspecciona las vistas disponibles. La placa de color individual se descarga en Exportar.</p>
    <div class="separation-grid" role="group" aria-label="Vistas de las separaciones">
      {#each [
        { id: 'result', label: 'Resultado', detail: 'Vista compuesta' },
        { id: 'original', label: 'Original', detail: 'Imagen fuente' },
        { id: 'compare', label: 'Comparar', detail: 'Antes y después' },
        { id: 'mask', label: 'Máscara', detail: 'Tinta en gris' },
        { id: 'underbase', label: 'Base blanca', detail: 'Placa blanca' },
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

    <div class="subsection">
      <h3>Base blanca</h3>
      <label class="switch">
        <input type="checkbox" bind:checked={editor.underbase} />
        <span>Generar base blanca</span>
      </label>

      <div class="field">
        <label for="underbase-style">Tipo de base</label>
        <select id="underbase-style" bind:value={editor.underbaseStyle} disabled={!editor.underbase}>
          <option value="dot">Tramada (puntos)</option>
          <option value="solid">Sólida</option>
        </select>
      </div>

      <label class="switch">
        <input type="checkbox" bind:checked={editor.showUnderbase} disabled={!editor.underbase} />
        <span>Mostrar base blanca en el resultado</span>
      </label>

      <div class="field">
        <div class="field-head">
          <label for="choke-range">Choke (px)</label>
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
        </div>
        <input
          id="choke-range"
          class="range-control"
          type="range"
          min="0"
          max="3"
          step="0.5"
          bind:value={editor.choke}
          disabled={!editor.underbase}
          aria-valuetext={`${editor.choke} píxeles`}
          style={`--range-progress: ${rangeProgressPercent(editor.choke, 0, 3)}%;`}
        />
      </div>
      <p class="hint">La base sigue la tinta visible y se erosiona con el choke.</p>
    </div>
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
    gap: 0.8rem;
    padding: 0.15rem 0.8rem 0.85rem;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: color-mix(in srgb, var(--surface-2) 45%, var(--surface));
    scroll-margin-block: 0.75rem;
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
    font-size: 0.8rem;
    font-weight: 650;
    cursor: pointer;
    list-style: none;
    user-select: none;
  }

  .group-title::-webkit-details-marker { display: none; }
  .group-title:hover { background: color-mix(in srgb, var(--surface-3) 60%, transparent); }

  .chevron {
    width: 8px;
    height: 8px;
    flex: 0 0 8px;
    border-right: 1.5px solid var(--muted);
    border-bottom: 1.5px solid var(--muted);
    transform: rotate(45deg) translateY(-2px);
  }

  .group[open] > .group-title .chevron { transform: rotate(225deg) translate(-1px, -1px); }
  .group-title:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .field-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem;
    min-height: 38px;
  }

  .field-head label,
  .field > label:not(.switch),
  .select-field > span {
    color: var(--text-2);
    font-size: 0.8rem;
    line-height: 1.35;
  }

  .number-input {
    width: 5.2rem;
    min-height: 42px;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font: 0.85rem/1.2 var(--mono);
    font-variant-numeric: tabular-nums;
    text-align: right;
    color-scheme: dark;
  }

  .number-input:focus-visible,
  select:focus-visible,
  .color-picker input:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
  }

  .number-input:disabled,
  select:disabled { opacity: 0.46; }

  select {
    width: 100%;
    min-height: 46px;
    padding: 0.55rem 0.7rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font-family: inherit;
    font-size: 0.84rem;
    line-height: 1.25;
    cursor: pointer;
  }

  .row {
    display: flex;
    gap: 0.5rem;
  }

  .row button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    min-height: 46px;
    flex: 1 1 0;
    padding: 0.55rem 0.6rem;
    border-radius: 8px;
    font-family: inherit;
    font-size: 0.78rem;
    font-weight: 650;
    line-height: 1.2;
    cursor: pointer;
  }

  .primary { border: 1px solid var(--primary); background: var(--primary); color: var(--primary-ink); }
  .primary:hover { background: #7546e8; }
  .ghost { border: 1px solid var(--border); background: var(--surface-2); color: var(--text); }
  .ghost:hover { border-color: var(--primary-text); }
  .row button:disabled { opacity: 0.42; cursor: not-allowed; }

  .file-name {
    overflow: hidden;
    margin: 0;
    color: var(--text);
    font: 0.76rem/1.4 var(--mono);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .document-info {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
    padding: 0.6rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
  }

  .info-item span { color: var(--muted); font-size: 0.66rem; }
  .info-item strong { color: var(--text); font: 0.73rem/1.3 var(--mono); overflow-wrap: anywhere; }
  .info-item strong.unavailable { color: var(--muted); }

  .subsection {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    padding-top: 0.65rem;
    border-top: 1px solid var(--border);
  }

  .subsection h3 {
    margin: 0;
    color: var(--primary-text);
    font-size: 0.71rem;
    font-weight: 650;
    letter-spacing: 0.075em;
    text-transform: uppercase;
  }

  .zoom-buttons {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .zoom-buttons button {
    min-height: 44px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--text-2);
    font: 600 0.78rem/1.2 var(--mono);
    cursor: pointer;
  }

  .zoom-buttons button.active {
    border-color: var(--primary-text);
    background: color-mix(in srgb, var(--primary) 18%, var(--surface));
    color: var(--primary-text);
  }

  .zoom-buttons button:focus-visible,
  .presets button:focus-visible,
  .separation-grid button:focus-visible,
  .shirt-swatch:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
  }

  .switch {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    min-height: 46px;
    color: var(--text-2);
    font-size: 0.8rem;
    line-height: 1.35;
  }

  .switch input {
    width: 1.2rem;
    height: 1.2rem;
    flex: 0 0 1.2rem;
    accent-color: var(--primary);
  }

  .switch input:disabled { opacity: 0.42; }

  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .presets button {
    min-width: 48px;
    min-height: 40px;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--surface);
    color: var(--text-2);
    font: 0.72rem/1.2 var(--mono);
    cursor: pointer;
  }

  .presets button.active {
    border-color: var(--primary-text);
    background: color-mix(in srgb, var(--primary) 18%, var(--surface));
    color: var(--primary-text);
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
    box-shadow: inset 3px 0 var(--primary);
  }

  .separation-grid button span { font-size: 0.74rem; font-weight: 650; }
  .separation-grid button small { color: var(--muted); font-size: 0.64rem; }

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
    min-width: 0;
    min-height: 44px;
    padding: 0.4rem 0.25rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text-2);
    font-family: inherit;
    font-size: 0.74rem;
    line-height: 1.2;
    cursor: pointer;
  }

  .shirt-swatch.active { border-color: var(--primary-text); color: var(--text); }
  .swatch-dot { width: 0.8rem; height: 0.8rem; border: 1px solid rgb(255 255 255 / 32%); border-radius: 50%; background: var(--swatch); }

  .color-picker {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    min-height: 44px;
    color: var(--text-2);
    font-size: 0.8rem;
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

  .hint { margin: 0; color: var(--muted); font-size: 0.74rem; line-height: 1.5; }
  .error { margin: 0; color: var(--error); font-size: 0.78rem; line-height: 1.4; }

  @media (max-width: 880px) {
    .panel { gap: 0.45rem; }
    .group { gap: 0.7rem; }
    .group-title { min-height: 48px; }
    .number-input, select, .row button, .zoom-buttons button, .presets button, .switch { min-height: 48px; }
    .range-control { min-height: 48px; }
  }
</style>
