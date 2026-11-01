import type { ScrcpyMediaStreamPacket } from '@yume-chan/scrcpy';
import { t } from '@/lib/i18n';

export type AudioStatusListener = (status: string) => void;

const MAX_QUEUED_SOURCES = 16;
const MAX_LEAD_SECONDS = 0.25;
const MAX_DECODE_QUEUE = 8;

const CODEC_MIME: Record<string, string> = {
  aac: 'mp4a.40.2',
  opus: 'opus',
  flac: 'flac',
};

export class ScrcpyAudioPlayer {
  static get isSupported(): boolean {
    return typeof globalThis.AudioDecoder !== 'undefined' && typeof globalThis.AudioContext !== 'undefined';
  }

  static supports(codec: string): boolean {
    return codec in CODEC_MIME;
  }

  get audioStream(): MediaStream {
    return this.monitor.stream;
  }

  private readonly context: AudioContext;
  private readonly decoder: AudioDecoder;
  private readonly mime: string;
  private readonly monitor: MediaStreamAudioDestinationNode;
  private readonly sources = new Set<AudioBufferSourceNode>();
  private nextTime = 0;
  private closed = false;
  private failed = false;

  constructor(codec: string, private readonly onStatus: AudioStatusListener) {
    const mime = CODEC_MIME[codec];
    if (!mime) throw new Error(t('mirror.audioPlayer.unsupportedCodec', { codec }));
    this.mime = mime;
    this.context = new AudioContext({ sampleRate: 48_000, latencyHint: 'interactive' });
    this.monitor = this.context.createMediaStreamDestination();
    this.context.onstatechange = () => {
      if (this.closed || this.failed) return;
      this.onStatus(this.context.state === 'running'
        ? t('mirror.audioPlayer.playing')
        : t('mirror.audioPlayer.resumeHint'));
    };
    try {
      this.decoder = new AudioDecoder({
        output: data => this.play(data),
        error: error => this.fail(error),
      });
    } catch (error) {
      this.context.onstatechange = null;
      void this.context.close().catch(() => undefined);
      throw error;
    }
    this.onStatus(t('mirror.audioPlayer.resumeHint'));
  }

  async write(packet: ScrcpyMediaStreamPacket): Promise<void> {
    if (this.closed || this.failed) return;
    try {
      if (packet.type === 'configuration') {
        const config = {
          codec: this.mime,
          sampleRate: 48_000,
          numberOfChannels: 2,
          description: packet.data as BufferSource,
        };
        const support = await AudioDecoder.isConfigSupported(config);
        if (this.closed) return;
        if (!support.supported) throw new Error(t('mirror.audioPlayer.browserCodecUnsupported', { mime: this.mime }));
        this.decoder.configure(config);
        return;
      }
      if (
        this.decoder.state === 'configured' &&
        this.context.state === 'running' &&
        this.decoder.decodeQueueSize < MAX_DECODE_QUEUE
      ) {
        this.decoder.decode(
          new EncodedAudioChunk({
            type: 'key',
            timestamp: Number(packet.pts ?? 0n),
            data: packet.data as BufferSource,
          }),
        );
      }
    } catch (error) {
      this.fail(error);
    }
  }

  async resume(): Promise<void> {
    if (this.closed) throw new Error(t('mirror.audioPlayer.notReady'));
    await this.context.resume();
  }

  async dispose(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.context.onstatechange = null;
    if (this.decoder.state !== 'closed') this.decoder.close();
    for (const source of this.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      source.disconnect();
    }
    this.sources.clear();
    for (const track of this.monitor.stream.getTracks()) track.stop();
    await this.context.close().catch(() => undefined);
  }

  private play(data: AudioData): void {
    try {
      if (this.closed || this.context.state !== 'running') return;
      const now = this.context.currentTime;
      // Drop excess frames instead of accumulating latency.
      if (this.nextTime > now + MAX_LEAD_SECONDS || this.sources.size >= MAX_QUEUED_SOURCES) return;
      const buffer = this.context.createBuffer(data.numberOfChannels, data.numberOfFrames, data.sampleRate);
      for (let plane = 0; plane < data.numberOfChannels; plane += 1) {
        data.copyTo(buffer.getChannelData(plane), { planeIndex: plane, format: 'f32-planar' });
      }
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.context.destination);
      source.connect(this.monitor);
      this.sources.add(source);
      source.onended = () => {
        source.disconnect();
        this.sources.delete(source);
      };
      const when = Math.max(now + 0.015, this.nextTime);
      source.start(when);
      this.nextTime = when + buffer.duration;
    } catch (error) {
      this.fail(error);
    } finally {
      data.close();
    }
  }

  private fail(error: unknown): void {
    if (this.closed || this.failed) return;
    this.failed = true;
    this.onStatus(t('mirror.audioPlayer.unavailable', {
      error: error instanceof Error ? error.message : String(error),
    }));
    void this.dispose().catch(() => undefined);
  }
}
