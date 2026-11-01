import type { Adb, AdbNoneProtocolProcess } from '@yume-chan/adb';
import {
  AndroidKeyEventAction,
  AndroidScreenPowerMode,
  type ScrcpyControlMessageWriter,
} from '@yume-chan/scrcpy';
import { WebCodecsVideoDecoder } from '@yume-chan/scrcpy-decoder-webcodecs';
import { WritableStream } from '@yume-chan/stream-extra';
import { t } from '@/lib/i18n';
import { pushScrcpyServer, startScrcpy, type ScrcpyClient } from '@/lib/adb/scrcpy';
import type { ScrcpySettings } from '@/lib/adb/scrcpySettings';
import { toErrorMessage } from '@/lib/utils/format';
import { setupAudioStream } from './scrcpyAudio';
import type { ScrcpyAudioPlayer } from './scrcpyAudioPlayer';
import { ScrcpyControls } from './scrcpyControls';
import type { HidDevice } from './scrcpyHid';
import type { ScrollMessage, TouchMessage } from './scrcpyMessages';
import { consumeStream } from './scrcpyStreams';
import { UhidDevices } from './scrcpyUhid';
import { VideoPipeline, type VideoPipelineHost } from './scrcpyVideo';
import type { VideoContent } from './videoPadding';

export type SessionStatus = 'connecting' | 'connected' | 'error';

export interface ScrcpySessionEvents {
  onStatus: (status: SessionStatus, message?: string) => void;
  onSize: (width: number, height: number) => void;
  onContent: (content: VideoContent | undefined) => void;
  onAudio: (status: string) => void;
  onClipboard: (text: string) => void;
  onControlError: (message: string) => void;
}

const START_TIMEOUT = 30_000;

export class ScrcpySession {
  private readonly abort = new AbortController();
  private readonly controls: ScrcpyControls;
  private readonly uhid: UhidDevices;
  private readonly pipelineHost: VideoPipelineHost;
  private client: ScrcpyClient | undefined;
  private process: AdbNoneProtocolProcess | undefined;
  private audio: ScrcpyAudioPlayer | undefined;
  private video: VideoPipeline | undefined;
  private timer: number | undefined;
  private status: SessionStatus = 'connecting';
  private disposed = false;
  private disposing: Promise<void> | undefined;

  constructor(
    private readonly adb: Adb,
    private readonly settings: ScrcpySettings,
    private readonly events: ScrcpySessionEvents,
  ) {
    this.uhid = new UhidDevices({
      run: action => this.run(action),
      settings: this.settings,
    });
    this.controls = new ScrcpyControls({
      run: action => this.run(action),
      videoSize: () => [this.video?.videoWidth ?? 0, this.video?.videoHeight ?? 0] as const,
      hidReady: (device: HidDevice) => this.uhid.isReady(device),
    });
    this.pipelineHost = {
      signal: this.abort.signal,
      onFirstFrame: () => this.markConnected(),
      onSize: (width, height) => this.events.onSize(width, height),
      onContent: content => this.events.onContent(content),
      fail: error => this.fail(error),
    };
  }

  async start(canvas: HTMLCanvasElement): Promise<void> {
    const signal = this.abort.signal;
    this.events.onStatus('connecting');
    this.events.onAudio(this.settings.audio ? t('mirror.session.waitingAudio') : t('mirror.session.audioOff'));
    this.timer = window.setTimeout(
      () => this.fail(new Error(t('mirror.session.startTimeout'))),
      START_TIMEOUT,
    );
    try {
      if (!WebCodecsVideoDecoder.isSupported) {
        throw new Error(t('mirror.session.webcodecsUnsupported'));
      }
      const client = await this.openClient(signal);
      if (!client) return;
      this.client = client;
      void client.exited.then(
        () => this.fail(new Error(t('mirror.session.serverExited'))),
        error => this.fail(error),
      );
      void setupAudioStream(client.audioStream, signal, text => {
        if (!signal.aborted) this.events.onAudio(text);
      }, player => {
        this.audio = player;
      });
      void VideoPipeline.attach(client.videoStream, canvas, this.pipelineHost)
        .then(pipeline => {
          if (this.disposed) pipeline.dispose();
          else this.video = pipeline;
        })
        .catch(error => this.fail(error));
      this.consumeClientOutput(client, signal);
      if (!client.controller && this.settings.videoSource === 'display') {
        throw new Error(t('mirror.session.noControl'));
      }
    } catch (error) {
      this.fail(error);
    }
  }

  pressKey(keyCode: number): Promise<boolean> {
    return this.controls.pressKey(keyCode);
  }

  keyEvent(
    keyCode: number,
    action: AndroidKeyEventAction,
    metaState: number,
    repeat: number,
  ): Promise<boolean> {
    return this.controls.keyEvent(keyCode, action, metaState, repeat);
  }

  sendText(text: string): Promise<boolean> {
    return this.controls.sendText(text);
  }

  hidKeyboard(report: Uint8Array): Promise<boolean> {
    return this.controls.hidKeyboard(report);
  }

  hidMouse(buttons: number, dx: number, dy: number, wheel = 0): Promise<boolean> {
    return this.controls.hidMouse(buttons, dx, dy, wheel);
  }

  startApp(name: string): Promise<boolean> {
    return this.controls.startApp(name);
  }

  touch(message: TouchMessage): Promise<boolean> {
    return this.controls.touch(message);
  }

  scroll(message: ScrollMessage): Promise<boolean> {
    return this.controls.scroll(message);
  }

  setClipboard(content: string): Promise<boolean> {
    return this.controls.setClipboard(content);
  }

  rotate(): Promise<boolean> {
    return this.controls.rotate();
  }

  expandNotifications(): Promise<boolean> {
    return this.controls.expandNotifications();
  }

  setScreenPower(on: boolean): Promise<boolean> {
    return this.controls.setScreenPower(on);
  }

  async resumeAudio(): Promise<void> {
    if (!this.audio) throw new Error(t('mirror.session.audioNotReady'));
    await this.audio.resume();
  }

  get audioStream(): MediaStream | undefined {
    return this.audio?.audioStream;
  }

  async screenshot(): Promise<Blob> {
    if (this.status !== 'connected') throw new Error(t('mirror.session.screenNotReady'));
    const blob = await this.video?.snapshot();
    if (!blob) throw new Error(t('mirror.session.noFrame'));
    return blob;
  }

  dispose(): Promise<void> {
    this.disposing ??= this.performDispose();
    return this.disposing;
  }

  private async openClient(signal: AbortSignal): Promise<ScrcpyClient | undefined> {
    await pushScrcpyServer(this.adb, signal);
    if (signal.aborted) return undefined;
    const client = await startScrcpy(this.adb, this.settings, {
      signal,
      onProcess: process => {
        this.process = process;
      },
    });
    if (signal.aborted) {
      await client.close().catch(() => undefined);
      return undefined;
    }
    return client;
  }

  private consumeClientOutput(client: ScrcpyClient, signal: AbortSignal): void {
    consumeStream(
      client.output,
      new WritableStream<string>({ write: () => undefined }),
      signal,
      t('mirror.session.labelOutput'),
      error => this.fail(error),
    );
    if (!client.clipboard) return;
    consumeStream(
      client.clipboard,
      new WritableStream<string>({
        write: text => {
          if (!signal.aborted) this.events.onClipboard(text);
        },
      }),
      signal,
      t('mirror.session.labelClipboard'),
      error => this.fail(error),
    );
  }

  private async performDispose(): Promise<void> {
    const powerOff = this.settings.powerOffOnClose && this.status === 'connected' && this.settings.videoSource === 'display';
    if (powerOff) await this.run(c => c.setScreenPowerMode(AndroidScreenPowerMode.Off)).catch(() => undefined);
    if (this.client?.controller && this.status === 'connected') {
      for (const id of this.uhid.openIds()) {
        await this.run(c => c.uHidDestroy(id)).catch(() => undefined);
      }
    }
    this.disposed = true;
    window.clearTimeout(this.timer);
    this.abort.abort();
    this.video?.dispose();
    this.video = undefined;
    const tasks: PromiseLike<unknown>[] = [];
    tasks.push(this.client?.close() ?? this.process?.kill() ?? Promise.resolve());
    tasks.push(this.audio?.dispose() ?? Promise.resolve());
    this.client = undefined;
    this.audio = undefined;
    await Promise.allSettled(tasks);
  }

  private markConnected(): void {
    if (this.status === 'connected') return;
    this.status = 'connected';
    window.clearTimeout(this.timer);
    this.events.onStatus('connected');
    void this.uhid.open();
    if (this.settings.startApp) void this.startApp(this.settings.startApp);
    if (this.settings.startScreenOff && this.settings.videoSource === 'display') void this.setScreenPower(false);
  }

  private async run(action: (controller: ScrcpyControlMessageWriter) => Promise<void>): Promise<boolean> {
    const controller = this.client?.controller;
    if (!controller || this.status !== 'connected' || this.abort.signal.aborted) return false;
    try {
      await action(controller);
      return true;
    } catch (error) {
      if (!this.abort.signal.aborted) {
        this.events.onControlError(t('mirror.session.controlFailed', { error: toErrorMessage(error) }));
      }
      return false;
    }
  }

  private fail(error: unknown): void {
    if (this.disposed || this.abort.signal.aborted) return;
    this.status = 'error';
    window.clearTimeout(this.timer);
    this.events.onStatus('error', toErrorMessage(error));
    this.events.onAudio(t('mirror.session.audioStopped'));
    void this.dispose();
  }
}
