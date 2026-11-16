import type { HalftoneImageSource, HalftoneImageStats } from '../types/halftone';
import { createDemoImage } from '../utils/demo-image';

export const FILE_ACCEPT = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';

const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

/** Estado del documento: fuente cargada, nombre y errores de importación. */
export class DocumentState {
  source = $state<HalftoneImageSource | null>(null);
  demoBitmap = $state<ImageBitmap | null>(null);
  selectedName = $state('Demo generada');
  error = $state<string | null>(null);
  fileError = $state<string | null>(null);
  isDragging = $state(false);
  exportReady = $state(false);
  imageStats = $state<HalftoneImageStats | null>(null);
  fileInput = $state<HTMLInputElement | null>(null);

  get hasDocument(): boolean {
    return this.source !== null;
  }

  openFilePicker(): void {
    this.fileInput?.click();
  }

  useDemo(): void {
    if (!this.demoBitmap) return;
    this.fileError = null;
    this.exportReady = false;
    this.selectedName = 'Demo generada';
    this.source = this.demoBitmap;
  }

  async loadDemo(): Promise<void> {
    try {
      const bitmap = await createDemoImage(1024);
      this.demoBitmap = bitmap;
      if (!this.source) this.source = bitmap;
    } catch (cause) {
      if (!this.source) {
        this.error =
          cause instanceof Error ? cause.message : 'No se pudo generar la imagen de prueba.';
      }
    }
  }

  dispose(): void {
    this.demoBitmap?.close();
    this.demoBitmap = null;
  }

  isSupportedFile(file: File): boolean {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    return (
      SUPPORTED_MIME_TYPES.includes(file.type.toLowerCase()) ||
      SUPPORTED_EXTENSIONS.includes(extension)
    );
  }

  selectFile(file: File | undefined): void {
    this.fileError = null;
    if (!file) return;

    if (file.size === 0) {
      this.fileError = 'El archivo está vacío.';
      return;
    }

    if (!this.isSupportedFile(file)) {
      this.fileError = 'Formato no compatible. Usa PNG, JPG o WebP.';
      return;
    }

    this.exportReady = false;
    this.selectedName = file.name;
    this.source = file;
  }

  handleFileChange(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    this.selectFile(input.files?.[0]);
    // Permite volver a seleccionar el mismo archivo.
    input.value = '';
  }

  handleDragEnter(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  handleDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  }

  handleDragLeave(event: DragEvent): void {
    const container = event.currentTarget as HTMLElement;
    if (!container.contains(event.relatedTarget as Node | null)) {
      this.isDragging = false;
    }
  }

  handleDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    this.selectFile(event.dataTransfer?.files[0]);
  }
}
