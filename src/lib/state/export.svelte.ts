import type {
  HalftoneCanvasHandle,
  HalftoneExportKind,
  HalftoneExportResult,
} from '../types/halftone';
import { exportCalibrationSheet } from '../utils/calibration-export';
import { exportCalibrationForRip } from '../utils/calibration-rip';
import { exportHalftonePng, type HalftoneExportOptions } from '../utils/export';

const EXPORT_LABELS: Record<HalftoneExportKind, string> = {
  color: 'separación de color',
  underbase: 'base blanca',
  composite: 'composite sobre camiseta',
};

/** Estado y acciones de exportación (capas y hojas de calibración). */
export class ExportState {
  exporting = $state<HalftoneExportKind | null>(null);
  calibrating = $state(false);
  preparingRip = $state(false);
  lastExportTiming = $state<{ label: string; ms: number } | null>(null);
  message = $state<string | null>(null);
  warning = $state<string | null>(null);
  error = $state<string | null>(null);

  /** Handle del canvas de la vista previa, asignado por el editor. */
  canvas: HalftoneCanvasHandle | null = null;

  /** Opciones actuales del motor, inyectadas por el editor. */
  getOptions: () => HalftoneExportOptions = () => {
    throw new Error('Las opciones de exportación no están configuradas.');
  };

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  private reductionWarning(result: HalftoneExportResult): string | null {
    if (!result.downscaled) return null;
    const effective =
      result.effectiveDpi !== undefined ? Math.round(result.effectiveDpi) : null;
    return (
      `La GPU redujo la salida a ${result.width} × ${result.height} px` +
      (effective !== null ? ` (${effective} DPI efectivos)` : '') +
      '. Se conservaron el tamaño físico y el LPI; hay menos detalle por pulgada.'
    );
  }

  private reset(): void {
    this.message = null;
    this.warning = null;
    this.error = null;
    this.lastExportTiming = null;
  }

  async downloadPng(kind: HalftoneExportKind): Promise<void> {
    if (!this.canvas) {
      this.error = 'La vista previa aún no está lista para exportar.';
      return;
    }

    this.exporting = kind;
    this.reset();

    const startedAt = performance.now();
    try {
      const result = await this.canvas.exportPng(kind);
      this.downloadBlob(result.blob, result.filename);
      const ms = result.durationMs ?? performance.now() - startedAt;
      this.lastExportTiming = { label: EXPORT_LABELS[kind], ms };
      this.warning = this.reductionWarning(result);
      this.message =
        `Descargado: ${result.filename} · ${result.width} × ${result.height} px · ` +
        `${Math.round(ms)} ms`;
    } catch (cause) {
      this.error =
        cause instanceof Error
          ? `No se pudo exportar: ${cause.message}`
          : 'No se pudo generar la exportación.';
    } finally {
      this.exporting = null;
    }
  }

  async downloadCalibration(): Promise<void> {
    if (this.calibrating) return;

    this.calibrating = true;
    this.reset();

    const startedAt = performance.now();
    try {
      const result = await exportCalibrationSheet(this.getOptions());
      this.downloadBlob(result.blob, result.filename);
      const ms = result.durationMs ?? performance.now() - startedAt;
      this.lastExportTiming = { label: 'hoja de calibración', ms };
      this.warning = this.reductionWarning(result);
      this.message =
        `Hoja de calibración: ${result.filename} · ${result.width} × ${result.height} px · ` +
        `${Math.round(ms)} ms`;
    } catch (cause) {
      this.error =
        cause instanceof Error
          ? `No se pudo generar la calibración: ${cause.message}`
          : 'No se pudo generar la hoja de calibración.';
    } finally {
      this.calibrating = false;
    }
  }

  async downloadRipSheet(): Promise<void> {
    if (this.preparingRip) return;

    this.preparingRip = true;
    this.reset();

    const startedAt = performance.now();
    try {
      const result = await exportCalibrationForRip(this.getOptions());
      this.downloadBlob(result.blob, result.filename);
      const ms = result.durationMs ?? performance.now() - startedAt;
      this.lastExportTiming = { label: 'hoja para RIP', ms };
      this.warning = this.reductionWarning(result);
      this.message =
        `Hoja para RIP: ${result.filename} · ${result.width} × ${result.height} px · ` +
        `${Math.round(ms)} ms`;
    } catch (cause) {
      this.error =
        cause instanceof Error
          ? `No se pudo generar la hoja para RIP: ${cause.message}`
          : 'No se pudo generar la hoja para RIP.';
    } finally {
      this.preparingRip = false;
    }
  }
}
