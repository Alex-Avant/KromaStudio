import { describe, expect, it } from 'vitest';
import {
  BOOLEAN_PARAMETER_REGISTRY,
  ENUM_PARAMETER_REGISTRY,
  EXPORT_PARAMETER_REGISTRY,
  HALFTONE_PARAMETER_REGISTRY,
  validateBooleanParameter,
  validateEnumParameter,
  validateNumericParameter,
} from './parameter-registry';

describe('central halftone parameter registry', () => {
  it('publishes stable ids, units, defaults and ranges for core controls', () => {
    expect(HALFTONE_PARAMETER_REGISTRY.lpi).toMatchObject({ id: 'screen.lpi', defaultValue: 35, min: 15, max: 60, unit: 'LPI' });
    expect(HALFTONE_PARAMETER_REGISTRY.angle).toMatchObject({ id: 'screen.angle', defaultValue: 22.5, min: 0, max: 180, unit: '°' });
    expect(HALFTONE_PARAMETER_REGISTRY.minDot).toMatchObject({ id: 'screen.min-dot', defaultValue: 0.08, min: 0.01, max: 0.2, unit: '%' });
    expect(HALFTONE_PARAMETER_REGISTRY.dpi).toMatchObject({ id: 'output.dpi', defaultValue: 300, min: 72, max: 600, unit: 'DPI' });
  });

  it('validates finite values and falls back for invalid values', () => {
    expect(validateNumericParameter('lpi', 100)).toBe(60);
    expect(validateNumericParameter('contrast', -120)).toBe(-100);
    expect(validateNumericParameter('gamma', Number.NaN)).toBe(1);
  });

  it('registers enum, boolean and physical-export controls with stable metadata', () => {
    expect(ENUM_PARAMETER_REGISTRY.applicationMode.values).toEqual(['fades', 'knockout', 'full']);
    expect(BOOLEAN_PARAMETER_REGISTRY.mirror.id).toBe('output.mirror');
    expect(EXPORT_PARAMETER_REGISTRY.physicalWidthIn.unit).toBe('in');
    expect(validateBooleanParameter('edgeSmooth', 'true')).toBe(true);
    expect(validateEnumParameter('applicationMode', 'missing')).toBe('fades');
  });
});
