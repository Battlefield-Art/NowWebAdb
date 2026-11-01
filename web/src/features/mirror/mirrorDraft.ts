import type {
  ScrcpyAngle,
  ScrcpyAudioCodec,
  ScrcpyAudioSource,
  ScrcpyCameraFacing,
  ScrcpyCaptureOrientation,
  ScrcpyKeyboardMode,
  ScrcpyMouseMode,
  ScrcpySettings,
  ScrcpyVideoCodec,
  ScrcpyVideoSource,
} from '@/lib/adb/scrcpySettings';

export type MirrorTab = 'video' | 'audio' | 'device';

export interface MirrorDraft {
  videoSource: ScrcpyVideoSource;
  maxSize: string;
  maxFps: string;
  bitrate: string;
  codec: ScrcpyVideoCodec;
  encoder: string;
  displayId: string;
  crop: string;
  captureOrientation: string;
  cameraId: string;
  cameraSize: string;
  cameraFacing: ScrcpyCameraFacing | '';
  cameraFps: string;
  cameraHighSpeed: boolean;
  angle: string;
  audio: boolean;
  audioSource: ScrcpyAudioSource;
  audioCodec: ScrcpyAudioCodec;
  audioBitrate: string;
  audioDup: boolean;
  showTouches: boolean;
  stayAwake: boolean;
  startScreenOff: boolean;
  powerOffOnClose: boolean;
  screenOffSeconds: string;
  keyboardMode: ScrcpyKeyboardMode;
  mouseMode: ScrcpyMouseMode;
  clipboardSync: boolean;
  virtualDisplay: boolean;
  virtualDisplayWidth: string;
  virtualDisplayHeight: string;
  virtualDisplayDpi: string;
  startApp: string;
}

export function toMirrorDraft(settings: ScrcpySettings): MirrorDraft {
  return {
    videoSource: settings.videoSource,
    maxSize: String(settings.maxSize),
    maxFps: String(settings.maxFps),
    bitrate: String(settings.videoBitRate / 1_000_000),
    codec: settings.videoCodec,
    encoder: settings.videoEncoder,
    displayId: String(settings.displayId),
    crop: settings.crop,
    captureOrientation: String(settings.captureOrientation),
    cameraId: settings.cameraId,
    cameraSize: settings.cameraSize,
    cameraFacing: settings.cameraFacing,
    cameraFps: String(settings.cameraFps),
    cameraHighSpeed: settings.cameraHighSpeed,
    angle: String(settings.angle),
    audio: settings.audio,
    audioSource: settings.audioSource,
    audioCodec: settings.audioCodec,
    audioBitrate: String(settings.audioBitRate / 1000),
    audioDup: settings.audioDup,
    showTouches: settings.showTouches,
    stayAwake: settings.stayAwake,
    startScreenOff: settings.startScreenOff,
    powerOffOnClose: settings.powerOffOnClose,
    screenOffSeconds: String(settings.screenOffTimeoutSeconds),
    keyboardMode: settings.keyboardMode,
    mouseMode: settings.mouseMode,
    clipboardSync: settings.clipboardSync,
    virtualDisplay: settings.virtualDisplay,
    virtualDisplayWidth: String(settings.virtualDisplayWidth),
    virtualDisplayHeight: String(settings.virtualDisplayHeight),
    virtualDisplayDpi: String(settings.virtualDisplayDpi),
    startApp: settings.startApp,
  };
}

function captureOrientation(value: string): ScrcpyCaptureOrientation {
  if (value === '' || value === 'initial') return value;
  return Number(value) as ScrcpyCaptureOrientation;
}

export function fromMirrorDraft(draft: MirrorDraft): Partial<ScrcpySettings> {
  return {
    videoSource: draft.videoSource,
    maxSize: Number(draft.maxSize),
    maxFps: Number(draft.maxFps),
    videoBitRate: Math.round(Number(draft.bitrate) * 1_000_000),
    videoCodec: draft.codec,
    videoEncoder: draft.encoder,
    displayId: Number(draft.displayId),
    crop: draft.crop,
    captureOrientation: captureOrientation(draft.captureOrientation),
    cameraId: draft.cameraId,
    cameraSize: draft.cameraSize,
    cameraFacing: draft.cameraFacing,
    cameraFps: Number(draft.cameraFps),
    cameraHighSpeed: draft.cameraHighSpeed,
    angle: Number(draft.angle) as ScrcpyAngle,
    audio: draft.audio,
    audioSource: draft.audioSource,
    audioCodec: draft.audioCodec,
    audioBitRate: Math.round(Number(draft.audioBitrate) * 1000),
    audioDup: draft.audioDup,
    showTouches: draft.showTouches,
    stayAwake: draft.stayAwake,
    startScreenOff: draft.startScreenOff,
    powerOffOnClose: draft.powerOffOnClose,
    screenOffTimeoutSeconds: Number(draft.screenOffSeconds),
    keyboardMode: draft.keyboardMode,
    mouseMode: draft.mouseMode,
    clipboardSync: draft.clipboardSync,
    virtualDisplay: draft.virtualDisplay,
    virtualDisplayWidth: Number(draft.virtualDisplayWidth),
    virtualDisplayHeight: Number(draft.virtualDisplayHeight),
    virtualDisplayDpi: Number(draft.virtualDisplayDpi),
    startApp: draft.startApp,
  };
}
