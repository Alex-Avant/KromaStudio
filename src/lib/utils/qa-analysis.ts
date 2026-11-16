/**
 * Estima el período dominante de una señal 1D por autocorrelación. Se usa en
 * la QA WebGPU para comprobar que la separación real de las líneas coincide
 * con DPI / LPI.
 */
export function estimatePeriod(
  samples: readonly number[],
  minLag = 2,
  maxLag = Math.floor(samples.length / 2),
): number {
  if (samples.length < 4 || maxLag <= minLag) return 0;

  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const centered = samples.map((value) => value - mean);
  const correlations: number[] = new Array(maxLag + 1).fill(0);

  for (let lag = minLag; lag <= maxLag; lag++) {
    let numerator = 0;
    let left = 0;
    let right = 0;
    for (let index = 0; index < centered.length - lag; index++) {
      numerator += centered[index] * centered[index + lag];
      left += centered[index] * centered[index];
      right += centered[index + lag] * centered[index + lag];
    }
    correlations[lag] = left > 0 && right > 0 ? numerator / Math.sqrt(left * right) : 0;
  }

  let bestLag = minLag;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const isLocalMaximum =
      correlations[lag] >= correlations[lag - 1] &&
      (lag === maxLag || correlations[lag] >= correlations[lag + 1]);
    if (isLocalMaximum && correlations[lag] > 0.5) {
      bestLag = lag;
      break;
    }
    if (correlations[lag] > correlations[bestLag]) bestLag = lag;
  }

  // Interpolación parabólica para períodos no enteros.
  if (bestLag > minLag && bestLag < maxLag) {
    const before = correlations[bestLag - 1];
    const peak = correlations[bestLag];
    const after = correlations[bestLag + 1];
    const denominator = before - 2 * peak + after;
    if (Math.abs(denominator) > 1e-9) {
      const offset = (0.5 * (before - after)) / denominator;
      if (Math.abs(offset) <= 1) return bestLag + offset;
    }
  }
  return bestLag;
}
