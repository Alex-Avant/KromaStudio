export interface CalibrationRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CalibrationCircle {
  x: number;
  y: number;
  radius: number;
}

export interface CalibrationGeometry {
  margin: number;
  contentWidth: number;
  ramp: CalibrationRect;
  coveragePatches: CalibrationRect[];
  circles: CalibrationCircle[];
  lines: CalibrationRect[];
  textRow: CalibrationRect;
  colorBlocks: CalibrationRect[];
  alphaRamp: CalibrationRect;
  holeBlock: CalibrationRect;
  labelBands: {
    ramp: CalibrationRect;
    coverage: CalibrationRect;
    geometry: CalibrationRect;
    typography: CalibrationRect;
    color: CalibrationRect;
    alpha: CalibrationRect;
  };
}

const BASE_WIDTH = 1200;

function rect(x: number, y: number, width: number, height: number): CalibrationRect {
  return { x, y, width, height };
}

function scaleRect(source: CalibrationRect, scale: number): CalibrationRect {
  return rect(
    Math.round(source.x * scale),
    Math.round(source.y * scale),
    Math.round(source.width * scale),
    Math.round(source.height * scale),
  );
}

/**
 * Coordenadas de la lámina de calibración. Las bandas de etiquetas se reservan
 * entre las filas de patrones para que el texto nunca invada la trama. Toda la
 * geometría se escala con el ancho para conservar el tamaño físico al cambiar
 * el DPI de salida.
 */
export function getCalibrationGeometry(width = BASE_WIDTH): CalibrationGeometry {
  const scale = width / BASE_WIDTH;
  const margin = 78;
  const contentWidth = 1044;
  const patchGap = 10;
  const patchWidth = (contentWidth - patchGap * 7) / 8;

  const coveragePatches = Array.from({ length: 8 }, (_, index) =>
    rect(margin + index * (patchWidth + patchGap), 300, patchWidth, 100),
  );

  const circles: CalibrationCircle[] = [0.18, 0.49, 0.8].map((ratio, index) => ({
    x: margin + contentWidth * ratio,
    y: 640,
    radius: [50, 72, 94][index],
  }));

  const lineWidths = [1, 2, 4, 8];
  const lines = lineWidths.map((lineWidth, index) =>
    rect(margin, 780 + index * 40, contentWidth, lineWidth),
  );

  return {
    margin: Math.round(margin * scale),
    contentWidth: Math.round(contentWidth * scale),
    ramp: scaleRect(rect(margin, 80, contentWidth, 110), scale),
    coveragePatches: coveragePatches.map((patch) => scaleRect(patch, scale)),
    circles: circles.map((circle) => ({
      x: Math.round(circle.x * scale),
      y: Math.round(circle.y * scale),
      radius: Math.round(circle.radius * scale),
    })),
    lines: lines.map((line) => scaleRect(line, scale)),
    textRow: scaleRect(rect(margin, 1000, contentWidth, 150), scale),
    colorBlocks: Array.from({ length: 3 }, (_, index) =>
      scaleRect(rect(margin + index * (contentWidth / 3), 1230, contentWidth / 3, 130), scale),
    ),
    alphaRamp: scaleRect(rect(margin, 1440, contentWidth, 80), scale),
    holeBlock: scaleRect(rect(margin, 1540, 110, 50), scale),
    labelBands: {
      ramp: scaleRect(rect(margin, 210, contentWidth, 55), scale),
      coverage: scaleRect(rect(margin, 410, contentWidth, 55), scale),
      geometry: scaleRect(rect(margin, 470, contentWidth, 55), scale),
      typography: scaleRect(rect(margin, 940, contentWidth, 55), scale),
      color: scaleRect(rect(margin, 1170, contentWidth, 55), scale),
      alpha: scaleRect(rect(margin, 1380, contentWidth, 55), scale),
    },
  };
}
