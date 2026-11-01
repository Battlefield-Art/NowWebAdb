import { t } from '@/lib/i18n';

export interface IconOptions {
  signal?: AbortSignal;
  timeout?: number;
}

export type LoadedDrawable =
  | { kind: 'image'; url: string }
  | { kind: 'color'; color: number }
  | { kind: 'adaptive'; background: LoadedDrawable | null; foreground: LoadedDrawable | null };

interface AdaptiveLayers {
  backgroundImage: string | null;
  backgroundColor: number | null;
  foreground: string | null;
}

export async function renderDrawable(drawable: LoadedDrawable | null): Promise<string> {
  if (!drawable) return '';
  if (drawable.kind === 'color') return '';
  if (drawable.kind === 'image') return finalizeImage(drawable.url);
  const backgroundImage = drawable.background?.kind === 'image' ? drawable.background.url : null;
  const backgroundColor = drawable.background?.kind === 'color' ? drawable.background.color : null;
  const foreground = drawable.foreground?.kind === 'image' ? drawable.foreground.url : null;
  const composed = await composeAdaptive({ backgroundImage, backgroundColor, foreground });
  if (composed) return composed;
  return finalizeImage(foreground || backgroundImage || '');
}

async function composeAdaptive({ backgroundImage, backgroundColor, foreground }: AdaptiveLayers): Promise<string> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return foreground || backgroundImage || '';
  }
  const size = 192;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return foreground || backgroundImage || '';
  if (backgroundImage) {
    const image = await loadImage(backgroundImage);
    if (image) drawCover(context, image, size);
  } else if (backgroundColor != null) {
    context.fillStyle = colorCss(backgroundColor);
    context.fillRect(0, 0, size, size);
  }
  if (foreground) {
    const image = await loadImage(foreground);
    if (image) context.drawImage(image, 0, 0, size, size);
  }
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return foreground || backgroundImage || '';
  }
}

export async function finalizeImage(url: string, size = 128): Promise<string> {
  if (!url) return '';
  if (typeof document === 'undefined' || typeof Image === 'undefined') return url;
  const image = await loadImage(url);
  if (!image) return url;
  if (!image.naturalWidth || !image.naturalHeight) return url;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return url;
  const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  context.drawImage(image, Math.round((size - width) / 2), Math.round((size - height) / 2), width, height);
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return url;
  }
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, size: number): void {
  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
}

function colorCss(value: number): string {
  const argb = value >>> 0;
  const alpha = ((argb >>> 24) & 0xff) / 255;
  return `rgba(${(argb >>> 16) & 0xff},${(argb >>> 8) & 0xff},${argb & 0xff},${alpha})`;
}

export function imageMime(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  return 'image/png';
}

export function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

export function svgDataUrl(svg: string): string {
  return bytesToDataUrl(new TextEncoder().encode(svg), 'image/svg+xml');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  if (typeof btoa !== 'function') throw new Error(t('apps.error.base64Unsupported'));
  return btoa(binary);
}
