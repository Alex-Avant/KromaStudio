import {
  HALFTONE_PARAMETER_REGISTRY,
  validateNumericParameter,
  type NumericParameterId,
} from './parameter-registry';

/** Utilidades compartidas por los campos numéricos del inspector. */

function inputValue(event: Event): number | null {
  const input = event.currentTarget as HTMLInputElement;
  const value = Number(input.value);
  return Number.isFinite(value) ? value : null;
}

/**
 * Al salir del campo numérico deja el valor dentro del mismo rango que el
 * slider, para que preview, exportación y ajustes guardados coincidan.
 */
export function clampNumberInput(
  event: Event,
  apply: (value: number) => void,
  min: number,
  max: number,
  fallback: number,
): void {
  const value = inputValue(event);
  apply(value === null ? fallback : Math.min(max, Math.max(min, value)));
}

/** Convierte un valor porcentual escrito por el usuario a su rango 0..1. */
export function handlePercentInput(
  event: Event,
  apply: (value: number) => void,
  max: number,
  min = 0,
): void {
  const value = inputValue(event);
  if (value === null) return;
  apply(Math.min(max, Math.max(min, value / 100)));
}

/** Porcentaje visible del relleno de un slider dentro de sus límites. */
export function rangeProgressPercent(value: number, min: number, max: number): number {
  if (![value, min, max].every(Number.isFinite) || max <= min) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

/** Lee un número mostrado en unidades de UI y lo valida con el registro central. */
export function clampRegisteredInput(
  event: Event,
  apply: (value: number) => void,
  id: NumericParameterId,
  minOverride?: number,
  maxOverride?: number,
): void {
  const input = event.currentTarget as HTMLInputElement;
  const displayValue = Number(input.value);
  const definition = HALFTONE_PARAMETER_REGISTRY[id];
  let internalValue = validateNumericParameter(id, displayValue / definition.displayScale);
  if (minOverride !== undefined) internalValue = Math.max(minOverride, internalValue);
  if (maxOverride !== undefined) internalValue = Math.min(maxOverride, internalValue);
  apply(internalValue);
}
