import { describe, expect, it } from 'vitest';
import { clampNumberInput, handlePercentInput, rangeProgressPercent } from './inputs';

function fakeEvent(value: string): Event {
  return { currentTarget: { value } } as unknown as Event;
}

describe('numeric inputs', () => {
  it('clamps values to the control range', () => {
    let applied = 0;
    clampNumberInput(fakeEvent('500'), (value) => (applied = value), 10, 120, 45);
    expect(applied).toBe(120);

    clampNumberInput(fakeEvent('2'), (value) => (applied = value), 10, 120, 45);
    expect(applied).toBe(10);
  });

  it('falls back when the value is not a number', () => {
    let applied = 0;
    clampNumberInput(fakeEvent('abc'), (value) => (applied = value), 10, 120, 45);
    expect(applied).toBe(45);
  });

  it('converts percentages to their 0..1 range', () => {
    let applied = 0;
    handlePercentInput(fakeEvent('5'), (value) => (applied = value), 0.2);
    expect(applied).toBeCloseTo(0.05, 6);

    handlePercentInput(fakeEvent('90'), (value) => (applied = value), 0.2);
    expect(applied).toBe(0.2);
  });

  it('returns a clamped slider fill percentage', () => {
    expect(rangeProgressPercent(5, 0, 10)).toBe(50);
    expect(rangeProgressPercent(-1, 0, 10)).toBe(0);
    expect(rangeProgressPercent(12, 0, 10)).toBe(100);
    expect(rangeProgressPercent(5, 10, 10)).toBe(0);
  });
});
