import { WebCodecsVideoDecoder, WebGLVideoFrameRenderer } from '@yume-chan/scrcpy-decoder-webcodecs';
import { t } from '@/lib/i18n';
import type { ScrcpyClient } from '@/lib/adb/scrcpy';
import { consumeStream } from './scrcpyStreams';
import { PaddingProbe, type VideoContent } from './videoPadding';

export interface VideoPipelineHost {
  readonly signal: AbortSignal;
  onFirstFrame: () => void;
  onSize: (width: number, height: number) => void;
  onContent: (content: VideoContent | undefined) => void;
  fail: (error: unknown) => void;
}

/** Owns the decoder, the WebGL renderer and the padding probe for one scrcpy video stream. */
export class VideoPipeline {
  private decoder: WebCodecsVideoDecoder | undefined;
  private sizeListener: { dispose(): void } | undefined;
  private readonly padding = new PaddingProbe();
  private width = 0;
  private height = 0;

  private constructor() {}

  static async attach(
    videoStream: ScrcpyClient['videoStream'],
    canvas: HTMLCanvasElement,
    host: VideoPipelineHost,
  ): Promise<VideoPipeline> {
    if (!videoStream) throw new Error(t('mirror.session.noVideo'));
    const video = await videoStream;
    if (host.signal.aborted) {
      await video.stream.cancel().catch(() => undefined);
      return new VideoPipeline();
    }
    const pipeline = new VideoPipeline();
    const renderer = new WebGLVideoFrameRenderer(canvas);
    const draw = renderer.draw.bind(renderer);
    renderer.draw = async frame => {
      await draw(frame);
      if (host.signal.aborted) return;
      host.onFirstFrame();
      const content = pipeline.padding.sample(frame);
      if (content) host.onContent(content);
    };
    pipeline.decoder = new WebCodecsVideoDecoder({ codec: video.metadata.codec, renderer });
    pipeline.sizeListener = pipeline.decoder.sizeChanged(size => {
      if (host.signal.aborted) return;
      if (pipeline.width !== size.width || pipeline.height !== size.height) {
        pipeline.padding.reset();
        host.onContent(undefined);
      }
      pipeline.width = size.width;
      pipeline.height = size.height;
      host.onSize(size.width, size.height);
    });
    consumeStream(
      video.stream,
      pipeline.decoder.writable,
      host.signal,
      t('mirror.session.labelVideo'),
      cause => host.fail(cause),
      true,
    );
    return pipeline;
  }

  get videoWidth(): number {
    return this.width;
  }

  get videoHeight(): number {
    return this.height;
  }

  snapshot(): Promise<Blob | undefined> {
    return this.decoder?.snapshot() ?? Promise.resolve(undefined);
  }

  dispose(): void {
    for (const target of [this.sizeListener, this.decoder]) {
      try {
        target?.dispose();
      } catch {
        /* already closed */
      }
    }
    this.sizeListener = undefined;
    this.decoder = undefined;
  }
}
