import { t } from '@/lib/i18n';

export type ScrcpyVideoCodec = 'h264' | 'h265' | 'av1';
export type ScrcpyVideoSource = 'display' | 'camera';
export type ScrcpyAudioCodec = 'aac' | 'opus' | 'flac' | 'raw';
export type ScrcpyAudioSource = 'output' | 'mic' | 'playback';
export type ScrcpyCameraFacing = 'front' | 'back' | 'external';
export type ScrcpyCaptureOrientation = '' | 'initial' | 0 | 90 | 180 | 270;
export type ScrcpyAngle = 0 | 90 | 180 | 270;
export type ScrcpyKeyboardMode = 'inject' | 'uhid';
export type ScrcpyMouseMode = 'touch' | 'uhid';

export interface ScrcpySettings {
  videoSource: ScrcpyVideoSource;
  maxSize: number;
  maxFps: number;
  videoBitRate: number;
  videoCodec: ScrcpyVideoCodec;
  videoEncoder: string;
  displayId: number;
  showTouches: boolean;
  stayAwake: boolean;
  audio: boolean;
  audioSource: ScrcpyAudioSource;
  audioCodec: ScrcpyAudioCodec;
  audioBitRate: number;
  audioDup: boolean;
  crop: string;
  captureOrientation: ScrcpyCaptureOrientation;
  startScreenOff: boolean;
  powerOffOnClose: boolean;
  screenOffTimeoutSeconds: number;
  cameraId: string;
  cameraSize: string;
  cameraFacing: ScrcpyCameraFacing | '';
  cameraFps: number;
  cameraHighSpeed: boolean;
  angle: ScrcpyAngle;
  keyboardMode: ScrcpyKeyboardMode;
  mouseMode: ScrcpyMouseMode;
  clipboardSync: boolean;
  virtualDisplay: boolean;
  virtualDisplayWidth: number;
  virtualDisplayHeight: number;
  virtualDisplayDpi: number;
  startApp: string;
}

export const DEFAULT_SCRCPY_SETTINGS: ScrcpySettings = {
  videoSource: 'display',
  maxSize: 1080,
  maxFps: 60,
  videoBitRate: 8_000_000,
  videoCodec: 'h264',
  videoEncoder: '',
  displayId: 0,
  showTouches: false,
  stayAwake: false,
  audio: false,
  audioSource: 'output',
  audioCodec: 'aac',
  audioBitRate: 128_000,
  audioDup: false,
  crop: '',
  captureOrientation: '',
  startScreenOff: false,
  powerOffOnClose: false,
  screenOffTimeoutSeconds: 0,
  cameraId: '',
  cameraSize: '',
  cameraFacing: '',
  cameraFps: 0,
  cameraHighSpeed: false,
  angle: 0,
  keyboardMode: 'inject',
  mouseMode: 'touch',
  clipboardSync: true,
  virtualDisplay: false,
  virtualDisplayWidth: 0,
  virtualDisplayHeight: 0,
  virtualDisplayDpi: 0,
  startApp: '',
};

const RANGES = {
  maxSize: [0, 8192],
  maxFps: [1, 240],
  videoBitRate: [100_000, 100_000_000],
  displayId: [0, 4096],
  audioBitRate: [8_000, 512_000],
  screenOffTimeoutSeconds: [0, 86_400],
  cameraFps: [0, 240],
  virtualDisplayWidth: [0, 8192],
  virtualDisplayHeight: [0, 8192],
  virtualDisplayDpi: [0, 640],
} as const;

const VIDEO_CODECS: readonly ScrcpyVideoCodec[] = ['h264', 'h265', 'av1'];
const AUDIO_CODECS: readonly ScrcpyAudioCodec[] = ['aac', 'opus', 'flac', 'raw'];
const AUDIO_SOURCES: readonly ScrcpyAudioSource[] = ['output', 'mic', 'playback'];
const CAMERA_FACINGS: readonly ScrcpyCameraFacing[] = ['front', 'back', 'external'];
const CAPTURE_ORIENTATIONS: readonly ScrcpyCaptureOrientation[] = ['', 'initial', 0, 90, 180, 270];
const ANGLES: readonly ScrcpyAngle[] = [0, 90, 180, 270];
const KEYBOARD_MODES: readonly ScrcpyKeyboardMode[] = ['inject', 'uhid'];
const MOUSE_MODES: readonly ScrcpyMouseMode[] = ['touch', 'uhid'];

function integer(key: keyof typeof RANGES, value: unknown): number {
  const [min, max] = RANGES[key];
  const parsed = Number(value ?? DEFAULT_SCRCPY_SETTINGS[key]);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(t('mirror.validate.integerRange', { key: key, min: min, max: max }));
  }
  return parsed;
}

function oneOf<T extends string | number>(value: unknown, allowed: readonly T[], message: string): T {
  if (!allowed.includes(value as T)) throw new Error(message);
  return value as T;
}

function text(value: unknown, pattern: RegExp, message: string, limit: number): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') throw new Error(message);
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.length > limit || !pattern.test(trimmed)) throw new Error(message);
  return trimmed;
}

export function normalizeCrop(value: unknown): string {
  const crop = text(value, /^\d{1,5}:\d{1,5}:\d{1,5}:\d{1,5}$/, t('mirror.validate.cropFormat'), 32);
  if (!crop) return '';
  const [width, height] = crop.split(':').map(Number);
  if ((width as number) < 1 || (height as number) < 1) throw new Error(t('mirror.validate.cropSize'));
  return crop;
}

function normalizeCameraSize(value: unknown): string {
  const size = text(value, /^\d{1,5}x\d{1,5}$/, t('mirror.validate.cameraSizeFormat'), 24);
  if (!size) return '';
  const [width, height] = size.split('x').map(Number);
  if ((width as number) < 1 || (height as number) < 1 || (width as number) > 8192) {
    throw new Error(t('mirror.validate.cameraSizeRange'));
  }
  return size;
}

export function normalizeScrcpySettings(value: Partial<ScrcpySettings> = {}): ScrcpySettings {
  const videoSource = oneOf(value.videoSource ?? 'display', ['display', 'camera'] as const, t('mirror.validate.videoSource'));
  const audio = value.audio === true;
  const audioDup = value.audioDup === true;
  let audioSource = oneOf(value.audioSource ?? 'output', AUDIO_SOURCES, t('mirror.validate.audioSource'));
  if (audioDup) audioSource = 'playback';
  // Camera capture can only record the microphone, not the playback output.
  if (videoSource === 'camera' && audio && audioSource === 'output') audioSource = 'mic';
  const virtualDisplayWidth = integer('virtualDisplayWidth', value.virtualDisplayWidth);
  const virtualDisplayHeight = integer('virtualDisplayHeight', value.virtualDisplayHeight);
  if ((virtualDisplayWidth === 0) !== (virtualDisplayHeight === 0)) {
    throw new Error(t('mirror.validate.virtualDisplayPair'));
  }
  return {
    videoSource,
    maxSize: integer('maxSize', value.maxSize),
    maxFps: integer('maxFps', value.maxFps),
    videoBitRate: integer('videoBitRate', value.videoBitRate),
    videoCodec: oneOf(value.videoCodec ?? 'h264', VIDEO_CODECS, t('mirror.validate.videoCodec')),
    videoEncoder: text(value.videoEncoder, /^[\w.-]+$/, t('mirror.validate.videoEncoder'), 128),
    displayId: integer('displayId', value.displayId),
    showTouches: value.showTouches === true,
    stayAwake: value.stayAwake === true,
    audio,
    audioSource,
    audioCodec: oneOf(value.audioCodec ?? 'aac', AUDIO_CODECS, t('mirror.validate.audioCodec')),
    audioBitRate: integer('audioBitRate', value.audioBitRate),
    audioDup,
    crop: normalizeCrop(value.crop),
    captureOrientation: oneOf(value.captureOrientation ?? '', CAPTURE_ORIENTATIONS, t('mirror.validate.captureOrientation')),
    startScreenOff: value.startScreenOff === true,
    powerOffOnClose: value.powerOffOnClose === true,
    screenOffTimeoutSeconds: integer('screenOffTimeoutSeconds', value.screenOffTimeoutSeconds),
    cameraId: text(value.cameraId, /^[\w.-]+$/, t('mirror.validate.cameraId'), 64),
    cameraSize: normalizeCameraSize(value.cameraSize),
    cameraFacing: (value.cameraFacing ? oneOf(value.cameraFacing, CAMERA_FACINGS, t('mirror.validate.cameraFacing')) : ''),
    cameraFps: integer('cameraFps', value.cameraFps),
    cameraHighSpeed: value.cameraHighSpeed === true,
    angle: oneOf(value.angle ?? 0, ANGLES, t('mirror.validate.angle')),
    keyboardMode: oneOf(value.keyboardMode ?? 'inject', KEYBOARD_MODES, t('mirror.validate.keyboardMode')),
    mouseMode: oneOf(value.mouseMode ?? 'touch', MOUSE_MODES, t('mirror.validate.mouseMode')),
    clipboardSync: value.clipboardSync !== false,
    virtualDisplay: value.virtualDisplay === true,
    virtualDisplayWidth,
    virtualDisplayHeight,
    virtualDisplayDpi: integer('virtualDisplayDpi', value.virtualDisplayDpi),
    startApp: text(
      value.startApp,
      /^[A-Za-z][\w]*(?:\.[A-Za-z][\w]*)+$/,
      t('mirror.validate.startApp'),
      128,
    ),
  };
}
