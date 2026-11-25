<script lang="ts">
  import type { DocumentState } from '../../state/document.svelte';
  import type { EditorState } from '../../state/editor.svelte';
  import { HALFTONE_PRESETS, type HalftonePresetId } from '../../utils/presets';
  import { HALFTONE_DEFAULTS } from '../../utils/settings';
  import ParameterControl from './ParameterControl.svelte';

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
  const PRESETS = Object.values(HALFTONE_PRESETS);
  const dimensions = $derived(
    doc.imageStats ? `${doc.imageStats.width} × ${doc.imageStats.height} px` : '—',
  );
  const activePreset = $derived(
    editor.activePresetId ? HALFTONE_PRESETS[editor.activePresetId] : null,
  );

  function setShirtColor(color: string): void {
    editor.shirtColor = color;
    editor.customShirtColor = color;
  }

  function handleCustomColor(event: Event): void {
    setShirtColor((event.currentTarget as HTMLInputElement).value);
  }

  function setPreset(id: string): void {
    editor.applyPreset(id as HalftonePresetId);
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
      <button type="button" class="ghost" onclick={() => doc.useDemo()} disabled={!doc.demoBitmap}>Demo</button>
    </div>
    <p class="file-name" title={doc.selectedName}>{doc.selectedName}</p>
    {#if doc.fileError}<p class="error" role="alert">{doc.fileError}</p>{/if}
    <p class="hint">PNG, JPG o WebP. Todo se procesa localmente.</p>

    <div class="document-info" aria-label="Información de la imagen">
      <div class="info-item"><span>Dimensiones</span><strong>{dimensions}</strong></div>
      <div class="info-item" title="El navegador no conserva el metadato DPI original al decodificar el archivo.">
        <span>DPI de fuente</span><strong class="unavailable">No disponible</strong>
      </div>
    </div>
    <p class="hint">El tamaño de impresión se configura en Exportar.</p>

    <div class="subsection">
      <h3>Vista del canvas</h3>
      <div class="zoom-buttons" role="group" aria-label="Escala del canvas">
        <button type="button" class:active={editor.previewMode === 'fit'} aria-pressed={editor.previewMode === 'fit'} onclick={() => (editor.previewMode = 'fit')}>Ajustar</button>
        <button type="button" class:active={editor.previewMode === 'actual'} aria-pressed={editor.previewMode === 'actual'} onclick={() => (editor.previewMode = 'actual')}>100 %</button>
      </div>
      <label class="field">
        <span>Fondo de previsualización</span>
        <select bind:value={editor.previewBackground}>
          <option value="checkerboard">Transparencia · tablero</option>
          <option value="black">Negro</option>
          <option value="white">Blanco</option>
          <option value="shirt">Color de camiseta</option>
        </select>
      </label>
      <p class="hint">En 100 %, arrastra sobre el canvas para desplazarte.</p>
    </div>

    <div class="subsection">
      <h3>Simulación de camiseta</h3>
      <div class="shirt-presets" role="group" aria-label="Color de camiseta">
        {#each SHIRT_PRESETS as preset}
          <button type="button" class="shirt-swatch" class:active={editor.shirtColor === preset.color} style={`--swatch: ${preset.color};`} aria-pressed={editor.shirtColor === preset.color} onclick={() => setShirtColor(preset.color)}>
            <span class="swatch-dot" aria-hidden="true"></span>{preset.label}
          </button>
        {/each}
      </div>
      <label class="color-picker">
        <span>Color personalizado</span>
        <input type="color" value={editor.customShirtColor} oninput={handleCustomColor} aria-label="Color personalizado de camiseta" />
      </label>
    </div>
  </details>

  <details class="group" id="panel-tonal">
    <summary class="group-title">Ajustes <span class="chevron" aria-hidden="true"></span></summary>

    <div class="field">
      <label for="color-mode">Modo de color</label>
      <select id="color-mode" bind:value={editor.colorMode}>
        <option value="color">Color original</option>
        <option value="mono">Monocromo</option>
      </select>
    </div>
    <div class="field">
      <label for="polarity">Polaridad tonal</label>
      <select id="polarity" bind:value={editor.polarity}>
        <option value="light">Imprimir luces</option>
        <option value="dark">Imprimir sombras</option>
      </select>
    </div>

    <ParameterControl parameter="brightness" value={editor.brightness} onChange={(value) => (editor.brightness = value)} />
    <ParameterControl parameter="contrast" value={editor.contrast} onChange={(value) => (editor.contrast = value)} />
    <ParameterControl parameter="gamma" value={editor.gamma} onChange={(value) => (editor.gamma = value)} />
    <ParameterControl parameter="blackPoint" value={editor.blackPoint} maxOverride={Math.min(254, editor.safeWhitePoint - 1)} onChange={(value) => (editor.blackPoint = Math.min(value, editor.safeWhitePoint - 1))} />
    <ParameterControl parameter="whitePoint" value={editor.safeWhitePoint} minOverride={Math.min(254, editor.blackPoint + 1)} onChange={(value) => (editor.whitePoint = Math.max(value, editor.blackPoint + 1))} />
    <p class="hint">Los niveles se expresan en 0–255. La curva tonal avanzada no está disponible.</p>
  </details>

  <details class="group" id="panel-trama" open>
    <summary class="group-title">Halftone <span class="chevron" aria-hidden="true"></span></summary>

    <div class="preset-section">
      <div class="section-heading"><h3>Presets profesionales</h3><span>{editor.presetModified ? 'Modificado' : activePreset ? 'Activo' : 'Manual'}</span></div>
      <div class="preset-grid" role="group" aria-label="Presets de trama">
        {#each PRESETS as preset}
          <button type="button" class="preset-button" class:active={editor.activePresetId === preset.id} aria-pressed={editor.activePresetId === preset.id} title={preset.description} onclick={() => setPreset(preset.id)}>
            <strong>{preset.label}</strong>
            <small>{preset.settings.lpi} LPI · {preset.settings.dotShape === 'circle' ? 'Redondo' : 'Elíptico'}</small>
          </button>
        {/each}
      </div>
      {#if activePreset}
        <p class="hint preset-description">{activePreset.description}{editor.presetModified ? ' · Se han cambiado parámetros del preset.' : ''}</p>
      {/if}
    </div>

    <div class="field">
      <label for="application-mode">Aplicación de la trama</label>
      <select id="application-mode" bind:value={editor.applicationMode}>
        <option value="fades">Fades Only · conserva sólidos</option>
        <option value="knockout">Knockout Shirt · perfora medios tonos</option>
        <option value="full">Full Halftone · tramado completo</option>
      </select>
      <p class="hint">
        {#if editor.applicationMode === 'fades'}Las zonas tonales sólidas se conservan; los medios tonos se tramán.
        {:else if editor.applicationMode === 'knockout'}Los medios tonos generan huecos transparentes en el alfa.
        {:else}Toda la imagen se representa con la pantalla AM.
        {/if}
      </p>
    </div>

    <div class="field">
      <label for="dot-shape">Forma del punto</label>
      <select id="dot-shape" bind:value={editor.dotShape}>
        <option value="circle">Redondo</option>
        <option value="ellipse">Elíptico</option>
        <option value="square">Cuadrado</option>
        <option value="line">Línea</option>
        <option value="diamond">Diamante</option>
      </select>
    </div>
    <ParameterControl parameter="lpi" value={editor.lpi} onChange={(value) => (editor.lpi = value)} />
    <div class="presets compact-presets" role="group" aria-label="Frecuencias LPI rápidas">
      {#each [25, 35, 45] as value}
        <button type="button" class:active={editor.lpi === value} aria-pressed={editor.lpi === value} onclick={() => (editor.lpi = value)}>{value} LPI</button>
      {/each}
    </div>
    <ParameterControl parameter="angle" value={editor.angle} onChange={(value) => (editor.angle = value)} />
    <ParameterControl parameter="minDot" value={editor.minDot} onChange={(value) => (editor.minDot = value)} />
    <ParameterControl parameter="maxDot" value={editor.maxDot} onChange={(value) => (editor.maxDot = value)} />

    <div class="switch-list">
      <label class="switch"><input type="checkbox" bind:checked={editor.edgeSmooth} /><span>Suavizado de bordes</span></label>
      <label class="switch"><input type="checkbox" bind:checked={editor.edgeProtect} /><span>Protección de detalle en celdas pequeñas</span></label>
      <ParameterControl parameter="solidThreshold" value={editor.solidThreshold} onChange={(value) => (editor.solidThreshold = value)} description="Fades Only conserva sólidos desde este valor." />
      <label class="switch"><input type="checkbox" bind:checked={editor.solidEnabled} /><span>Usar este umbral también en Full y Knockout</span></label>
    </div>

    <p class="metric">Celda lógica <strong>{editor.cellPitch.toFixed(3)} px</strong><span>DPI salida ÷ LPI</span></p>
    {#if editor.cellPitch < 1}
      <p class="error" role="alert">La trama necesita al menos un píxel lógico por celda. Sube el DPI o baja el LPI.</p>
    {:else if editor.cellPitch < 2}
      <p class="hint">Menos de dos píxeles por celda; el preview conserva cobertura, pero baja el detalle.</p>
    {/if}
  </details>

  <details class="group" id="panel-separaciones">
    <summary class="group-title">Separaciones <span class="chevron" aria-hidden="true"></span></summary>
    <p class="hint">Vista individual del color, la máscara y la base blanca.</p>
    <div class="separation-grid" role="group" aria-label="Vistas de las separaciones">
      {#each [
        { id: 'result', label: 'Color', detail: 'Resultado de tinta' },
        { id: 'original', label: 'Original', detail: 'Imagen fuente' },
        { id: 'compare', label: 'Comparar', detail: 'Antes y después' },
        { id: 'mask', label: 'Máscara alfa', detail: 'Cobertura resultante' },
        { id: 'underbase', label: 'Base blanca', detail: 'Placa de blanco' },
      ] as view}
        <button type="button" class:active={editor.previewView === view.id} aria-pressed={editor.previewView === view.id} onclick={() => (editor.previewView = view.id as typeof editor.previewView)}>
          <span>{view.label}</span><small>{view.detail}</small>
        </button>
      {/each}
    </div>

    <div class="subsection">
      <h3>Base blanca</h3>
      <label class="switch"><input type="checkbox" bind:checked={editor.underbase} /><span>Generar base blanca</span></label>
      <div class="field">
        <label for="underbase-style">Estrategia de base</label>
        <select id="underbase-style" bind:value={editor.underbaseStyle} disabled={!editor.underbase}>
          <option value="dot">Tramada · respeta la forma</option>
          <option value="solid">Sólida bajo tinta visible</option>
        </select>
      </div>
      <label class="switch"><input type="checkbox" bind:checked={editor.showUnderbase} disabled={!editor.underbase} /><span>Mostrar base en el resultado</span></label>
      <ParameterControl parameter="choke" value={editor.choke} onChange={(value) => (editor.choke = value)} disabled={!editor.underbase} />
      <ParameterControl parameter="spread" value={editor.spread} onChange={(value) => (editor.spread = value)} disabled={!editor.underbase} />
      <p class="hint">Choke y spread operan como erosión o expansión neta de la máscara de base.</p>
    </div>
  </details>
</div>

<style>
  .panel { display: flex; flex-direction: column; gap: 0.55rem; }
  .group { display: flex; flex-direction: column; gap: 0.8rem; padding: 0.15rem 0.8rem 0.85rem; border: 1px solid var(--border); border-radius: 12px; background: color-mix(in srgb, var(--surface-2) 45%, var(--surface)); scroll-margin-block: 0.75rem; }
  .group-title { display: flex; align-items: center; justify-content: space-between; gap: 0.7rem; min-height: 46px; margin: 0 -0.8rem; padding: 0.65rem 0.8rem; border-radius: 11px; color: var(--text); font-size: 0.8rem; font-weight: 650; cursor: pointer; list-style: none; user-select: none; }
  .group-title::-webkit-details-marker { display: none; }
  .group-title:hover { background: color-mix(in srgb, var(--surface-3) 60%, transparent); }
  .chevron { width: 8px; height: 8px; flex: 0 0 8px; border-right: 1.5px solid var(--muted); border-bottom: 1.5px solid var(--muted); transform: rotate(45deg) translateY(-2px); }
  .group[open] > .group-title .chevron { transform: rotate(225deg) translate(-1px, -1px); }
  .group-title:focus-visible, select:focus-visible, button:focus-visible, input:focus-visible { outline-color: var(--cyan); }
  .field { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
  .field > label, .field > span { color: var(--text-2); font-size: 0.79rem; line-height: 1.35; }
  .field select { width: 100%; min-height: 46px; padding: 0.55rem 0.7rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); font-family: inherit; font-size: 0.82rem; line-height: 1.2; }
  .row { display: flex; gap: 0.5rem; }
  .row button { min-width: 0; min-height: 46px; flex: 1 1 0; padding: 0.55rem 0.6rem; border-radius: 8px; font-family: inherit; font-size: 0.78rem; font-weight: 650; line-height: 1.2; cursor: pointer; }
  .primary { border: 1px solid var(--primary); background: var(--primary); color: var(--primary-ink); }
  .primary:hover { background: #7546e8; }
  .ghost { border: 1px solid var(--border); background: var(--surface-2); color: var(--text); }
  .row button:disabled, select:disabled { opacity: 0.45; cursor: not-allowed; }
  .file-name { overflow: hidden; margin: 0; color: var(--text); font: 0.75rem/1.4 var(--mono); text-overflow: ellipsis; white-space: nowrap; }
  .document-info { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 0.45rem; }
  .info-item { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; padding: 0.6rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); }
  .info-item span { color: var(--muted); font-size: 0.66rem; }
  .info-item strong { color: var(--text); font: 0.73rem/1.3 var(--mono); overflow-wrap: anywhere; }
  .info-item strong.unavailable { color: var(--muted); }
  .subsection { display: flex; flex-direction: column; gap: 0.65rem; padding-top: 0.65rem; border-top: 1px solid var(--border); }
  .subsection h3, .preset-section h3 { margin: 0; color: var(--primary-text); font-size: 0.7rem; font-weight: 650; letter-spacing: 0.07em; text-transform: uppercase; }
  .zoom-buttons { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 0.4rem; }
  .zoom-buttons button { min-height: 44px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-2); font: 600 0.78rem/1.2 var(--mono); cursor: pointer; }
  .zoom-buttons button.active, .preset-button.active { border-color: var(--primary-text); background: color-mix(in srgb,var(--primary) 18%,var(--surface)); color: var(--primary-text); }
  .switch-list { display: flex; flex-direction: column; gap: 0.15rem; padding-top: 0.4rem; border-top: 1px solid var(--border); }
  .switch { display: flex; align-items: center; gap: 0.6rem; min-height: 44px; color: var(--text-2); font-size: 0.77rem; line-height: 1.3; }
  .switch input { width: 1.15rem; height: 1.15rem; flex: 0 0 1.15rem; accent-color: var(--primary); }
  .presets { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .presets button { min-width: 46px; min-height: 40px; padding: 0.35rem 0.55rem; border: 1px solid var(--border); border-radius: 7px; background: var(--surface); color: var(--text-2); font: 0.7rem/1.2 var(--mono); cursor: pointer; }
  .presets button.active { border-color: var(--primary-text); background: color-mix(in srgb,var(--primary) 18%,var(--surface)); color: var(--primary-text); }
  .preset-section { display: flex; flex-direction: column; gap: 0.55rem; padding: 0.65rem; border: 1px solid var(--border); border-radius: 10px; background: var(--bg); }
  .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .section-heading > span { color: var(--cyan); font: 0.62rem/1.2 var(--mono); }
  .preset-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 0.4rem; }
  .preset-button { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 0.22rem; min-width: 0; min-height: 56px; padding: 0.5rem; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text); text-align: left; cursor: pointer; }
  .preset-button strong { font-size: 0.7rem; }
  .preset-button small { color: var(--muted); font: 0.6rem/1.2 var(--mono); }
  .preset-description { font-size: 0.68rem; }
  .metric { display: flex; align-items: baseline; gap: 0.5rem; margin: 0; padding: 0.55rem 0.65rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--muted); font-size: 0.68rem; }
  .metric strong { color: var(--cyan); font: 0.78rem/1.2 var(--mono); }
  .metric span { margin-left: auto; font-size: 0.61rem; }
  .separation-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 0.45rem; }
  .separation-grid button { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 0.25rem; min-height: 58px; padding: 0.55rem 0.6rem; border: 1px solid var(--border); border-radius: 9px; background: var(--bg); color: var(--text); text-align: left; cursor: pointer; }
  .separation-grid button.active { border-color: var(--primary-text); background: color-mix(in srgb,var(--primary) 17%,var(--surface)); box-shadow: inset 3px 0 var(--primary); }
  .separation-grid button span { font-size: 0.73rem; font-weight: 650; }
  .separation-grid button small { color: var(--muted); font-size: 0.62rem; }
  .shirt-presets { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 0.4rem; }
  .shirt-swatch { display: flex; align-items: center; justify-content: center; gap: 0.35rem; min-width: 0; min-height: 44px; padding: 0.4rem 0.25rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text-2); font-family: inherit; font-size: 0.73rem; line-height: 1.2; cursor: pointer; }
  .shirt-swatch.active { border-color: var(--primary-text); color: var(--text); }
  .swatch-dot { width: 0.8rem; height: 0.8rem; border: 1px solid rgb(255 255 255 / 32%); border-radius: 50%; background: var(--swatch); }
  .color-picker { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; min-height: 44px; color: var(--text-2); font-size: 0.79rem; }
  .color-picker input { width: 48px; height: 44px; padding: 3px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); }
  .hint { margin: 0; color: var(--muted); font-size: 0.73rem; line-height: 1.45; }
  .error { margin: 0; color: var(--error); font-size: 0.78rem; line-height: 1.4; }
  .zoom-buttons button:focus-visible, .preset-button:focus-visible, .presets button:focus-visible, .separation-grid button:focus-visible, .shirt-swatch:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }
  @media (max-width: 880px) { .panel { gap: 0.45rem; } .group { gap: 0.7rem; } .group-title { min-height: 48px; } .field select, .row button, .zoom-buttons button, .preset-button, .presets button, .switch { min-height: 48px; } }
</style>
