export const QA_TONE_VALUES = [0, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 1] as const;

export interface QaFixture {
  id: string;
  name: string;
  width: number;
  height: number;
  draw(ctx: CanvasRenderingContext2D): void;
}

export const QA_TONE_LADDER: QaFixture = {
  id: 'tone-ladder',
  name: 'Escala de tono de entrada (8 pasos)',
  width: 512,
  height: 128,
  draw(ctx) {
    const step = this.width / QA_TONE_VALUES.length;
    QA_TONE_VALUES.forEach((tone, index) => {
      const value = Math.round(tone * 255);
      ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
      ctx.fillRect(index * step, 0, step, this.height);
    });
  },
};

export const QA_POLARITY_BLOCKS: QaFixture = {
  id: 'polarity-blocks',
  name: 'Bloques blanco y negro',
  width: 256,
  height: 128,
  draw(ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.width / 2, this.height);
    ctx.fillStyle = '#000000';
    ctx.fillRect(this.width / 2, 0, this.width / 2, this.height);
  },
};

export const QA_ALPHA_RAMP: QaFixture = {
  id: 'alpha-ramp',
  name: 'Rampa de alfa sobre blanco',
  width: 256,
  height: 128,
  draw(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, this.width, 0);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  },
};

export const QA_TRANSPARENT: QaFixture = {
  id: 'transparent',
  name: 'Imagen completamente transparente',
  width: 128,
  height: 128,
  draw(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);
  },
};

export const QA_FIXTURES: readonly QaFixture[] = [
  QA_TONE_LADDER,
  QA_POLARITY_BLOCKS,
  QA_ALPHA_RAMP,
  QA_TRANSPARENT,
];

export function toneLadderRegions(width: number): Array<{ x: number; width: number }> {
  const step = width / QA_TONE_VALUES.length;
  return QA_TONE_VALUES.map((_, index) => ({ x: Math.round(index * step), width: Math.round(step) }));
}
