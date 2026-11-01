import { AdbNoneProtocolSpawner, type Adb, type AdbNoneProtocolProcess } from '@yume-chan/adb';
import { AdbScrcpyClient, AdbScrcpyOptions3_3_3 } from '@yume-chan/adb-scrcpy';
import { DefaultServerPath, ScrcpyInstanceId, ScrcpyNewDisplay } from '@yume-chan/scrcpy';
import { writeFile } from './fileStream';
import { throwIfAborted } from './async';
import type { ScrcpySettings } from './scrcpySettings';
import { t } from '@/lib/i18n';

const SERVER_URL = `${import.meta.env.BASE_URL}server.bin`;
const SERVER_CACHE = { value: undefined as Uint8Array | undefined };

export async function fetchScrcpyServer(signal?: AbortSignal): Promise<Uint8Array> {
  throwIfAborted(signal);
  if (SERVER_CACHE.value) return SERVER_CACHE.value;
  const response = await fetch(SERVER_URL, { signal });
  if (!response.ok) throw new Error(t('mirror.adb.downloadFailed', { status: response.status }));
  const type = response.headers.get('content-type') ?? '';
  if (type.includes('text/html')) throw new Error(t('mirror.adb.htmlResponse'));
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error(t('mirror.adb.invalidServer'));
  }
  SERVER_CACHE.value = bytes;
  return bytes;
}

export async function pushScrcpyServer(adb: Adb, signal?: AbortSignal): Promise<void> {
  const bytes = await fetchScrcpyServer(signal);
  throwIfAborted(signal);
  await writeFile(adb, DefaultServerPath, bytes, { mode: 0o644, signal });
}

export interface ScrcpyStartHooks {
  signal?: AbortSignal;
  onProcess?: (process: AdbNoneProtocolProcess) => void;
}

export function createScrcpySpawner(
  adb: Adb,
  signal?: AbortSignal,
  onProcess?: (process: AdbNoneProtocolProcess) => void,
): AdbNoneProtocolSpawner {
  return new AdbNoneProtocolSpawner(async (command, spawnSignal) => {
    signal?.throwIfAborted();
    const process = await adb.subprocess.noneProtocol.spawn(command, signal ?? spawnSignal);
    onProcess?.(process);
    if (signal?.aborted) {
      try {
        await process.kill();
      } catch {
        /* already exited */
      }
    }
    signal?.throwIfAborted();
    return process;
  });
}

function newDisplayOption(settings: ScrcpySettings): ScrcpyNewDisplay | undefined {
  if (!settings.virtualDisplay) return undefined;
  const { virtualDisplayWidth: width, virtualDisplayHeight: height, virtualDisplayDpi: dpi } = settings;
  if (width > 0 && height > 0) {
    return dpi > 0 ? new ScrcpyNewDisplay(width, height, dpi) : new ScrcpyNewDisplay(width, height);
  }
  return dpi > 0 ? new ScrcpyNewDisplay(dpi) : new ScrcpyNewDisplay();
}

type ScrcpyInit = AdbScrcpyOptions3_3_3.Init<boolean> & { keyboard?: string; mouse?: string };

export async function startScrcpy(adb: Adb, settings: ScrcpySettings, hooks: ScrcpyStartHooks = {}) {
  const { signal, onProcess } = hooks;
  const spawner = createScrcpySpawner(adb, signal, onProcess);
  const init: ScrcpyInit = {
    videoSource: settings.videoSource,
    displayId: settings.virtualDisplay ? 0 : settings.displayId,
    cameraId: settings.cameraId || undefined,
    cameraSize: settings.cameraSize || undefined,
    cameraFacing: settings.cameraFacing || undefined,
    cameraFps: settings.cameraFps || undefined,
    cameraHighSpeed: settings.cameraHighSpeed,
    angle: settings.angle,
    maxSize: settings.maxSize,
    maxFps: settings.maxFps,
    videoBitRate: settings.videoBitRate,
    videoCodec: settings.videoCodec,
    videoEncoder: settings.videoEncoder || undefined,
    showTouches: settings.showTouches,
    stayAwake: settings.stayAwake,
    audio: settings.audio,
    audioSource: settings.audioSource,
    audioCodec: settings.audioCodec,
    audioBitRate: settings.audioBitRate,
    audioDup: settings.audioDup,
    crop: settings.crop || undefined,
    captureOrientation: settings.captureOrientation === ''
      ? undefined
      : settings.captureOrientation === 'initial'
        ? '@'
        : `@${settings.captureOrientation}`,
    powerOffOnClose: settings.powerOffOnClose,
    screenOffTimeout: settings.screenOffTimeoutSeconds
      ? settings.screenOffTimeoutSeconds * 1000
      : undefined,
    clipboardAutosync: settings.clipboardSync,
    newDisplay: newDisplayOption(settings),
    keyboard: settings.keyboardMode === 'uhid' ? 'uhid' : undefined,
    mouse: settings.mouseMode === 'uhid' ? 'uhid' : undefined,
    scid: ScrcpyInstanceId.random(),
    tunnelForward: true,
    control: true,
    powerOn: true,
  };
  const options = new AdbScrcpyOptions3_3_3(init, { spawner });
  return AdbScrcpyClient.start(adb, DefaultServerPath, options);
}

export type ScrcpyClient = Awaited<ReturnType<typeof startScrcpy>>;
