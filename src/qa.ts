import type { HalftoneDotShape, HalftonePolarity } from './lib/types/halftone';
import type { HalftoneExportOptions } from './lib/utils/export';
import {
  exportHalftoneLayers,
  exportHalftonePng,
  exportMetricsFor,
} from './lib/utils/export';
import { estimatePeriod } from './lib/utils/qa-analysis';
import {
  QA_ALPHA_RAMP,
  QA_MIDTONE,
  QA_POLARITY_BLOCKS,
  QA_TONE_LADDER,
  QA_TONE_VALUES,
  QA_TRANSPARENT,
  toneLadderRegions,
  type QaFixture,
} from './lib/utils/qa-fixtures';

declare global {
  interface Window {
    __KROMA_QA_RESULT__?: QaReport;
    __KROMA_QA_RUN__?: () => Promise<void>;
  }
}

interface QaCase {
  name: string;
  pass: boolean;
  detail: string;
}

interface QaReport {
  generatedAt: string;
  passed: number;
  failed: number;
  cases: QaCase[];
}

interface AlphaImage {
  width: number;
  height: number;
  alpha: Uint8ClampedArray;
}

const SHAPE_LABELS: Record<HalftoneDotShape, string> = {
  circle: 'círculo',
  ellipse: 'elipse',
  diamond: 'diamante',
  square: 'cuadrado',
  line: 'línea',
};

function optionsFor(
  polarity: HalftonePolarity,
  underbase = false,
  dotShape: HalftoneDotShape = 'circle',
  lpi = 30,
  dpi = 300,
  angle = 45,
): HalftoneExportOptions {
  return {
    lpi,
    angle,
    contrast: 1,
    gamma: 1,
    minDot: 0.005,
    shadowPoint: 1,
    dotShape,
    dpi,
    underbase,
    choke: 0,
    underbaseStyle: 'dot',
    colorMode: 'color',
    polarity,
    blackPoint: 0,
    whitePoint: 1,
    shirtColor: '#000000',
  };
}

async function createFixtureBitmap(fixture: QaFixture): Promise<ImageBitmap> {
  const canvas = document.createElement('canvas');
  canvas.width = fixture.width;
  canvas.height = fixture.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el fixture.');
  fixture.draw(ctx);
  return createImageBitmap(canvas);
}

async function readAlpha(blob: Blob): Promise<AlphaImage> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('No se pudo leer el PNG exportado.');
    ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
    const alpha = new Uint8ClampedArray(bitmap.width * bitmap.height);
    for (let index = 0; index < alpha.length; index++) {
      alpha[index] = data[index * 4 + 3];
    }
    return { width: bitmap.width, height: bitmap.height, alpha };
  } finally {
    bitmap.close();
  }
}

function regionMean(image: AlphaImage, x: number, width: number): number {
  const start = Math.max(0, Math.round(x));
  const end = Math.min(image.width, Math.round(x + width));
  let sum = 0;
  let count = 0;
  for (let row = 0; row < image.height; row++) {
    for (let column = start; column < end; column++) {
      sum += image.alpha[row * image.width + column];
      count++;
    }
  }
  return count > 0 ? sum / count / 255 : 0;
}

function maxAlpha(image: AlphaImage): number {
  let max = 0;
  for (const value of image.alpha) max = Math.max(max, value);
  return max / 255;
}

function readColumn(image: AlphaImage, x: number): number[] {
  const column: number[] = [];
  const columnIndex = Math.min(image.width - 1, Math.max(0, Math.round(x)));
  for (let row = 0; row < image.height; row++) {
    column.push(image.alpha[row * image.width + columnIndex] / 255);
  }
  return column;
}

async function readPpi(blob: Blob): Promise<{ x: number; y: number } | null> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (type === 'pHYs') {
      return {
        x: view.getUint32(offset + 8, false),
        y: view.getUint32(offset + 12, false),
      };
    }
    offset += 12 + length;
  }
  return null;
}

function patchMeans(image: AlphaImage): number[] {
  return toneLadderRegions(image.width).map((region) =>
    regionMean(image, region.x, region.width),
  );
}

function monotonic(values: number[], direction: 'up' | 'down'): boolean {
  for (let index = 1; index < values.length; index++) {
    if (direction === 'up' && values[index] + 0.01 < values[index - 1]) return false;
    if (direction === 'down' && values[index] - 0.01 > values[index - 1]) return false;
  }
  return true;
}

function maxCoverageDeviation(means: number[]): number {
  const expected = QA_TONE_VALUES.slice(1, -1);
  return Math.max(
    ...expected.map((value, index) => Math.abs(means[index + 1] - value)),
  );
}

const format = (value: number) => value.toFixed(3);

async function runQa(): Promise<QaReport> {
  const cases: QaCase[] = [];
  const add = (name: string, pass: boolean, detail: string) => {
    cases.push({ name, pass, detail });
  };

  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return {
      generatedAt: new Date().toISOString(),
      passed: 0,
      failed: 1,
      cases: [
        {
          name: 'WebGPU disponible',
          pass: false,
          detail: 'Este navegador no expone navigator.gpu.',
        },
      ],
    };
  }

  const ladderBitmap = await createFixtureBitmap(QA_TONE_LADDER);
  let lightColor: Blob;
  let lightUnderbase: Blob;
  try {
    const lightResults = await exportHalftoneLayers(
      ladderBitmap,
      optionsFor('light', true),
      ['color', 'underbase'],
      ladderBitmap,
    );
    const color = lightResults.color;
    const underbase = lightResults.underbase;
    if (!color || !underbase) throw new Error('No se generaron las capas de prueba.');
    lightColor = color.blob;
    lightUnderbase = underbase.blob;

    const ppi = await readPpi(lightColor);
    const colorImage = await readAlpha(lightColor);
    add(
      'Dimensiones y 300 DPI',
      colorImage.width === QA_TONE_LADDER.width &&
        colorImage.height === QA_TONE_LADDER.height &&
        ppi?.x === Math.round(300 / 0.0254),
      `${colorImage.width}×${colorImage.height}, pHYs ${ppi?.x ?? 'ausente'}`,
    );

    const lightMeans = patchMeans(colorImage);
    add(
      'Luces: escala tonal ascendente',
      monotonic(lightMeans, 'up') && lightMeans[0] < 0.05 && lightMeans.at(-1)! > 0.9,
      lightMeans.map(format).join(' · '),
    );

    const middleDeviation = maxCoverageDeviation(lightMeans);
    add(
      'Precisión de cobertura · círculo',
      middleDeviation < 0.03,
      `desviación máxima ${middleDeviation.toFixed(4)}`,
    );

    const underbaseImage = await readAlpha(lightUnderbase);
    const underbaseMeans = patchMeans(underbaseImage);
    const maxDifference = Math.max(
      ...lightMeans.map((value, index) => Math.abs(value - underbaseMeans[index])),
    );
    add(
      'Máscara de color y underbase coinciden',
      maxDifference < 0.03,
      `diferencia máxima ${maxDifference.toFixed(4)}`,
    );
  } finally {
    ladderBitmap.close();
  }

  const darkBitmap = await createFixtureBitmap(QA_TONE_LADDER);
  try {
    const dark = await exportHalftonePng(
      darkBitmap,
      optionsFor('dark'),
      'color',
      darkBitmap,
    );
    const darkMeans = patchMeans(await readAlpha(dark.blob));
    add(
      'Sombras: escala tonal descendente',
      monotonic(darkMeans, 'down') && darkMeans[0] > 0.9 && darkMeans.at(-1)! < 0.05,
      darkMeans.map(format).join(' · '),
    );
  } finally {
    darkBitmap.close();
  }

  const extraShapes: HalftoneDotShape[] = ['ellipse', 'diamond', 'square', 'line'];
  for (const shape of extraShapes) {
    const bitmap = await createFixtureBitmap(QA_TONE_LADDER);
    try {
      const rendered = await exportHalftonePng(
        bitmap,
        optionsFor('light', false, shape),
        'color',
        bitmap,
      );
      const means = patchMeans(await readAlpha(rendered.blob));
      const deviation = maxCoverageDeviation(means);
      add(
        `Precisión de cobertura · ${SHAPE_LABELS[shape]}`,
        deviation < 0.03,
        `desviación máxima ${deviation.toFixed(4)} · ${means.map(format).join(' · ')}`,
      );
    } finally {
      bitmap.close();
    }
  }

  for (const lpi of [25, 35, 45]) {
    for (const dpi of [300, 600]) {
      const bitmap = await createFixtureBitmap(QA_TONE_LADDER);
      try {
        const rendered = await exportHalftonePng(
          bitmap,
          optionsFor('light', false, 'circle', lpi, dpi),
          'color',
          bitmap,
        );
        const image = await readAlpha(rendered.blob);
        const means = patchMeans(image);
        const deviation = maxCoverageDeviation(means);
        const ppi = await readPpi(rendered.blob);
        const dimensionsOk =
          image.width === QA_TONE_LADDER.width && image.height === QA_TONE_LADDER.height;
        const ppiOk = ppi?.x === Math.round(dpi / 0.0254);
        add(
          `Matriz LPI/DPI · ${lpi} LPI / ${dpi} DPI`,
          deviation < 0.035 && dimensionsOk && ppiOk,
          `desviación máxima ${deviation.toFixed(4)} · ` +
            `${image.width}×${image.height} · pHYs ${ppi?.x ?? 'ausente'} · ` +
            means.map(format).join(' · '),
        );
      } finally {
        bitmap.close();
      }
    }
  }

  for (const lpi of [25, 35, 45]) {
    const bitmap = await createFixtureBitmap(QA_MIDTONE);
    try {
      const rendered = await exportHalftonePng(
        bitmap,
        optionsFor('light', false, 'line', lpi, 300, 0),
        'color',
        bitmap,
      );
      const image = await readAlpha(rendered.blob);
      const expected = 300 / lpi;
      const minLag = Math.max(2, Math.floor(expected) - 3);
      const maxLag = Math.ceil(expected) + 3;
      const measured = estimatePeriod(
        readColumn(image, image.width / 2),
        minLag,
        maxLag,
      );
      add(
        `Frecuencia real · ${lpi} LPI`,
        Math.abs(measured - expected) <= 0.75,
        `esperado ${expected.toFixed(2)} px · medido ${measured.toFixed(2)} px`,
      );
    } finally {
      bitmap.close();
    }
  }

  const reducedMetrics = exportMetricsFor(
    { width: 1200, height: 1600, logicalWidth: 2400, logicalHeight: 3200 },
    300,
    45,
  );
  add(
    'DPI efectivo con reducción GPU',
    reducedMetrics.downscaled &&
      Math.abs(reducedMetrics.effectiveDpi - 150) < 0.001 &&
      Math.abs(1200 / reducedMetrics.effectiveDpi - 2400 / 300) < 0.001,
    `solicitado ${reducedMetrics.requestedDpi} · efectivo ${reducedMetrics.effectiveDpi.toFixed(1)} · escala ${reducedMetrics.exportScale}`,
  );

  const transparentBitmap = await createFixtureBitmap(QA_TRANSPARENT);
  try {
    const transparent = await exportHalftonePng(
      transparentBitmap,
      optionsFor('light'),
      'color',
      transparentBitmap,
    );
    const alpha = maxAlpha(await readAlpha(transparent.blob));
    add('Transparencia real', alpha === 0, `alfa máximo ${format(alpha)}`);
  } finally {
    transparentBitmap.close();
  }

  const blocksBitmap = await createFixtureBitmap(QA_POLARITY_BLOCKS);
  try {
    for (const polarity of ['light', 'dark'] as const) {
      const rendered = await exportHalftonePng(
        blocksBitmap,
        optionsFor(polarity),
        'color',
        blocksBitmap,
      );
      const image = await readAlpha(rendered.blob);
      const whiteMean = regionMean(image, 0, image.width / 2);
      const blackMean = regionMean(image, image.width / 2, image.width / 2);
      const pass =
        polarity === 'light'
          ? whiteMean > 0.5 && blackMean < 0.05
          : whiteMean < 0.05 && blackMean > 0.5;
      add(
        `Polaridad ${polarity === 'light' ? 'Luces' : 'Sombras'}`,
        pass,
        `blanco ${format(whiteMean)} · negro ${format(blackMean)}`,
      );
    }
  } finally {
    blocksBitmap.close();
  }

  const alphaBitmap = await createFixtureBitmap(QA_ALPHA_RAMP);
  try {
    const rendered = await exportHalftonePng(
      alphaBitmap,
      optionsFor('light'),
      'color',
      alphaBitmap,
    );
    const image = await readAlpha(rendered.blob);
    const edge = image.width * 0.05;
    const left = regionMean(image, 0, edge);
    const right = regionMean(image, image.width - edge, edge);
    add(
      'El alfa fuente limita la tinta',
      left < 0.05 && right > 0.9,
      `izquierda ${format(left)} · derecha ${format(right)}`,
    );
  } finally {
    alphaBitmap.close();
  }

  const failed = cases.filter((entry) => !entry.pass).length;
  return {
    generatedAt: new Date().toISOString(),
    passed: cases.length - failed,
    failed,
    cases,
  };
}

function renderReport(report: QaReport): void {
  const result = document.querySelector('#qa-results');
  const summary = document.querySelector('#qa-summary');
  if (!result || !summary) return;

  summary.textContent =
    report.failed === 0
      ? `Todo correcto: ${report.passed} comprobaciones.`
      : `${report.failed} fallo(s) de ${report.cases.length} comprobaciones.`;
  summary.className = report.failed === 0 ? 'ok' : 'fail';
  result.replaceChildren(
    ...report.cases.map((entry) => {
      const item = document.createElement('li');
      item.className = entry.pass ? 'ok' : 'fail';
      const title = document.createElement('strong');
      title.textContent = `${entry.pass ? 'PASS' : 'FAIL'} · ${entry.name}`;
      const detail = document.createElement('span');
      detail.textContent = entry.detail;
      item.append(title, detail);
      return item;
    }),
  );
}

function downloadReport(report: QaReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'kroma-qa-report.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function main(): void {
  const button = document.querySelector<HTMLButtonElement>('#qa-run');
  const download = document.querySelector<HTMLButtonElement>('#qa-download');
  const summary = document.querySelector<HTMLParagraphElement>('#qa-summary');
  const result = document.querySelector<HTMLUListElement>('#qa-results');
  if (!button || !download || !summary || !result) return;

  let lastReport: QaReport | null = null;

  const execute = async () => {
    button.disabled = true;
    download.disabled = true;
    summary.textContent = 'Generando exportaciones de prueba…';
    summary.className = '';
    result.replaceChildren();
    try {
      lastReport = await runQa();
      window.__KROMA_QA_RESULT__ = lastReport;
      renderReport(lastReport);
      download.disabled = false;
    } catch (cause) {
      summary.textContent =
        cause instanceof Error ? `QA interrumpida: ${cause.message}` : 'QA interrumpida.';
      summary.className = 'fail';
    } finally {
      button.disabled = false;
    }
  };

  button.addEventListener('click', () => void execute());
  download.addEventListener('click', () => {
    if (lastReport) downloadReport(lastReport);
  });
  window.__KROMA_QA_RUN__ = execute;
  void execute();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main, { once: true });
  } else {
    main();
  }
}
