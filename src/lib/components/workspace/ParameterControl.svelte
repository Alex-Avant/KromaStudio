<script lang="ts">
  import {
    clampRegisteredInput,
    rangeProgressPercent,
  } from '../../utils/inputs';
  import {
    HALFTONE_PARAMETER_REGISTRY,
    validateNumericParameter,
    type NumericParameterId,
  } from '../../utils/parameter-registry';

  interface Props {
    parameter: NumericParameterId;
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
    description?: string;
    minOverride?: number;
    maxOverride?: number;
  }

  let {
    parameter,
    value,
    onChange,
    disabled = false,
    description,
    minOverride,
    maxOverride,
  }: Props = $props();

  const definition = $derived(HALFTONE_PARAMETER_REGISTRY[parameter]);
  const controlId = $derived(`parameter-${definition.id.replaceAll('.', '-')}`);
  const displayValue = $derived(value * definition.displayScale);
  const rangeMin = $derived(minOverride ?? definition.min);
  const rangeMax = $derived(maxOverride ?? definition.max);

  function handleRange(event: Event): void {
    const next = Number((event.currentTarget as HTMLInputElement).value);
    onChange(validateNumericParameter(parameter, next));
  }

  function handleNumber(event: Event): void {
    clampRegisteredInput(event, onChange, parameter, rangeMin, rangeMax);
  }
</script>

<div class="parameter-control" class:disabled>
  <div class="parameter-head">
    <label for={`${controlId}-number`} title={definition.description}>{definition.label}</label>
    <div class="number-wrap">
      <input
        id={`${controlId}-number`}
        class="number-input"
        type="number"
        min={rangeMin * definition.displayScale}
        max={rangeMax * definition.displayScale}
        step={definition.step * definition.displayScale}
        value={Number.isInteger(displayValue) ? displayValue : Number(displayValue.toFixed(2))}
        onchange={handleNumber}
        disabled={disabled}
        aria-label={`${definition.label} numérico (${definition.unit})`}
      />
      {#if definition.unit !== 'nivel'}
        <span class="unit" aria-hidden="true">{definition.unit}</span>
      {/if}
    </div>
  </div>
  <input
    id={`${controlId}-range`}
    class="range-control"
    type="range"
    min={rangeMin}
    max={rangeMax}
    step={definition.step}
    value={validateNumericParameter(parameter, value)}
    oninput={handleRange}
    disabled={disabled}
    aria-label={definition.label}
    aria-valuetext={`${displayValue}${definition.unit === 'nivel' ? '' : ` ${definition.unit}`}`}
    style={`--range-progress: ${rangeProgressPercent(value, rangeMin, rangeMax)}%;`}
  />
  {#if description}
    <p class="description">{description}</p>
  {/if}
</div>

<style>
  .parameter-control {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  .parameter-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.55rem;
    min-height: 38px;
  }

  .parameter-head label {
    min-width: 0;
    color: var(--text-2);
    font-size: 0.79rem;
    line-height: 1.3;
  }

  .number-wrap {
    position: relative;
    display: flex;
    align-items: center;
    flex: 0 0 auto;
  }

  .number-input {
    width: 5rem;
    min-height: 42px;
    padding: 0.35rem 1.45rem 0.35rem 0.45rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font: 0.84rem/1.2 var(--mono);
    font-variant-numeric: tabular-nums;
    text-align: right;
    color-scheme: dark;
  }

  .unit {
    position: absolute;
    right: 0.42rem;
    color: var(--muted);
    font: 0.6rem/1 var(--mono);
    pointer-events: none;
  }

  .number-input:focus-visible {
    outline: 2px solid var(--cyan);
    outline-offset: 2px;
  }

  .number-input:disabled,
  .disabled { opacity: 0.48; }

  .description {
    margin: 0;
    color: var(--muted);
    font-size: 0.68rem;
    line-height: 1.4;
  }

  @media (max-width: 880px) {
    .number-input { min-height: 48px; }
    .parameter-head { min-height: 42px; }
  }
</style>
