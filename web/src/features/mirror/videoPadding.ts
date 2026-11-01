// Android encoders letterbox the display into the codec-aligned video size, so a
// decoded frame carries a few solid black rows above and below the real screen.
export interface VideoContent {
  top: number;
  bottom: number;
  width: number;
  height: number;
}

const BLACK = 20;
const MAX_SHARE = 0.02;
const PROBE_COLUMNS = [0.2, 0.5, 0.8];

export function measureVideoPadding(frame: VideoFrame): VideoContent | undefined {
  const width = frame.displayWidth;
  const height = frame.displayHeight;
  if (!width || !height) return undefined;
  const limit = Math.max(4, Math.round(height * MAX_SHARE));
  const strip = Math.min(height, limit + 1);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = strip * 2;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return undefined;
  context.drawImage(frame, 0, 0, width, strip, 0, 0, width, strip);
  context.drawImage(frame, 0, height - strip, width, strip, 0, strip, width, strip);
  const { data } = context.getImageData(0, 0, width, strip * 2);
  const columns = PROBE_COLUMNS.map(ratio => Math.floor(width * ratio));
  const blackRow = (y: number) =>
    columns.every(x => {
      const index = (y * width + x) * 4;
      return Math.max(data[index] ?? 0, data[index + 1] ?? 0, data[index + 2] ?? 0) <= BLACK;
    });
  let top = 0;
  while (top < strip && blackRow(top)) top += 1;
  let bottom = 0;
  while (bottom < strip && blackRow(strip * 2 - 1 - bottom)) bottom += 1;
  // Bars taller than the codec alignment are screen content (status bar, video
  // letterboxing in an app), not padding — leave the frame untouched.
  if (top > limit || bottom > limit) return undefined;
  return { top, bottom, width, height: height - top - bottom };
}

// The first frames may still be blank, so keep sampling (with a coarser interval
// after the first couple of seconds) until a frame shows the real screen.
export class PaddingProbe {
  private content: VideoContent | undefined;
  private probes = 0;
  private probedAt = 0;

  reset(): void {
    this.content = undefined;
    this.probes = 0;
    this.probedAt = 0;
  }

  sample(frame: VideoFrame): VideoContent | undefined {
    if (this.content || this.probes >= 60) return undefined;
    const now = performance.now();
    const interval = this.probes < 20 ? 120 : 600;
    if (now - this.probedAt < interval) return undefined;
    this.probedAt = now;
    this.probes += 1;
    try {
      this.content = measureVideoPadding(frame);
    } catch {
      return undefined;
    }
    return this.content;
  }
}
