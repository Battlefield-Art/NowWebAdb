import type { Adb, AdbFrameBuffer } from '@yume-chan/adb';
import { t } from '@/lib/i18n';

export interface ScreenshotOptions {
  format?: 'png' | 'jpeg';
  quality?: number;
  scale?: number;
}

export interface Screenshot {
  width: number;
  height: number;
  dataUrl: string;
  blob: Blob;
}

type Frame = AdbFrameBuffer & { colorSpace?: number };

function channel(value: number, offset: number, length: number): number {
  if (!length) return 255;
  const mask = (1 << length) - 1;
  const raw = (value >>> offset) & mask;
  return length === 8 ? raw : Math.round((raw / mask) * 255);
}

export function frameToImageData(frame: Frame): ImageData {
  const { width, height, bpp, data } = frame;
  const bytesPerPixel = Math.max(1, Math.round(bpp / 8));
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const pixels = new Uint8ClampedArray(width * height * 4);
  const readPixel = (index: number): number =>
    bytesPerPixel === 4 ? view.getUint32(index * 4, true) : view.getUint16(index * 2, true);
  for (let index = 0; index < width * height; index += 1) {
    const value = readPixel(index);
    const target = index * 4;
    pixels[target] = channel(value, frame.red_offset, frame.red_length);
    pixels[target + 1] = channel(value, frame.green_offset, frame.green_length);
    pixels[target + 2] = channel(value, frame.blue_offset, frame.blue_length);
    pixels[target + 3] = channel(value, frame.alpha_offset, frame.alpha_length);
  }
  return new ImageData(pixels, width, height);
}

function canvasToBlob(canvas: HTMLCanvasElement, format: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error(t('mirror.adb.screenshotFailed')))), format, quality);
  });
}

export async function captureScreenshot(adb: Adb, options: ScreenshotOptions = {}): Promise<Screenshot> {
  if (typeof document === 'undefined') throw new Error(t('mirror.adb.screenshotUnsupported'));
  const frame = (await adb.framebuffer()) as Frame;
  const source = document.createElement('canvas');
  source.width = frame.width;
  source.height = frame.height;
  const sourceContext = source.getContext('2d');
  if (!sourceContext) throw new Error(t('mirror.adb.noContext'));
  sourceContext.putImageData(frameToImageData(frame), 0, 0);

  const scale = Math.min(1, Math.max(0.05, options.scale ?? 1));
  const width = Math.max(1, Math.round(frame.width * scale));
  const height = Math.max(1, Math.round(frame.height * scale));
  let canvas = source;
  if (scale < 1) {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error(t('mirror.adb.noContext'));
    context.drawImage(source, 0, 0, width, height);
  }
  const format = options.format ?? 'png';
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const blob = await canvasToBlob(canvas, mime, options.quality);
  return { width, height, dataUrl: canvas.toDataURL(mime, options.quality), blob };
}
