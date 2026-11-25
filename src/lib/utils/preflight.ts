import type { HalftoneImageStats, HalftonePolarity } from '../types/halftone';

export interface PreflightWarning {
  level: 'warning' | 'info';
  text: string;
}

/**
 * Genera avisos informativos a partir de la fuente. No modifica la imagen ni
 * bloquea la exportación: el usuario decide según su diseño y su RIP.
 */
export function buildPreflightWarnings(
  stats: HalftoneImageStats,
  polarity: HalftonePolarity,
): PreflightWarning[] {
  const warnings: PreflightWarning[] = [];

  if (!stats.hasTransparency && stats.darkOpaqueBorder) {
    warnings.push(
      polarity === 'dark'
        ? {
            level: 'warning',
            text:
              'La fuente es opaca y tiene bordes oscuros. Con “Sombras imprimen” ese fondo también puede recibir tinta. Usa “Luces imprimen” o elimina el fondo antes de exportar.',
          }
        : {
            level: 'info',
            text:
              'Fuente opaca con bordes oscuros: con “Luces imprimen” el fondo oscuro no recibirá tinta.',
          },
    );
  }

  if (stats.partialAlphaRatio > 0.02) {
    warnings.push({
      level: 'warning',
      text:
        `Hay ${(stats.partialAlphaRatio * 100).toFixed(1)} % de píxeles semitransparentes. ` +
        'Su interpretación depende del RIP; revisa la máscara y la base blanca.',
    });
  }

  return warnings;
}

export function preflightSummary(
  stats: HalftoneImageStats,
  dpi: number,
  physicalWidthIn = stats.width / Math.max(1, dpi),
  physicalHeightIn = stats.height / Math.max(1, dpi),
): string {
  const safeDpi = Math.max(1, dpi);
  return (
    `Fuente ${stats.width} × ${stats.height} px · ` +
    `Salida ${Math.round(physicalWidthIn * safeDpi)} × ${Math.round(physicalHeightIn * safeDpi)} px · ` +
    `${physicalWidthIn.toFixed(2)} × ${physicalHeightIn.toFixed(2)} in a ${safeDpi} DPI · ` +
    `alfa ${(stats.transparentRatio * 100).toFixed(1)} % · ` +
    `parcial ${(stats.partialAlphaRatio * 100).toFixed(1)} %`
  );
}
