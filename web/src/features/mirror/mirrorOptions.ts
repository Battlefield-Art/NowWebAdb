import type { MessageKey, TFunction } from '@/lib/i18n';
import type {
  ScrcpyAudioCodec,
  ScrcpyAudioSource,
  ScrcpyCameraFacing,
  ScrcpyKeyboardMode,
  ScrcpyMouseMode,
  ScrcpyVideoCodec,
  ScrcpyVideoSource,
} from '@/lib/adb/scrcpySettings';

export type DraftOption<T extends string> =
  | { value: T; labelKey: MessageKey; disabled?: boolean }
  | { value: T; label: string; disabled?: boolean };

/** Resolves an option label, translating `labelKey` and passing literal labels through. */
export function draftOptionLabel<T extends string>(option: DraftOption<T>, translate: TFunction): string {
  return 'labelKey' in option ? translate(option.labelKey) : option.label;
}

export const VIDEO_SOURCE_OPTIONS: readonly DraftOption<ScrcpyVideoSource>[] = [
  { value: 'display', labelKey: 'mirror.option.videoDisplay' },
  { value: 'camera', labelKey: 'mirror.option.videoCamera' },
];

export const VIDEO_CODEC_OPTIONS: readonly DraftOption<ScrcpyVideoCodec>[] = [
  { value: 'h264', labelKey: 'mirror.option.codecH264' },
  { value: 'h265', labelKey: 'mirror.option.codecH265' },
  { value: 'av1', labelKey: 'mirror.option.codecAv1' },
];

export const AUDIO_CODEC_OPTIONS: readonly DraftOption<ScrcpyAudioCodec>[] = [
  { value: 'aac', labelKey: 'mirror.option.codecAac' },
  { value: 'opus', labelKey: 'mirror.option.codecOpus' },
  { value: 'flac', labelKey: 'mirror.option.codecFlac' },
  { value: 'raw', labelKey: 'mirror.option.codecRaw' },
];

export const AUDIO_SOURCE_OPTIONS: readonly DraftOption<ScrcpyAudioSource>[] = [
  { value: 'output', labelKey: 'mirror.option.audioOutput' },
  { value: 'mic', labelKey: 'mirror.option.audioMic' },
  { value: 'playback', labelKey: 'mirror.option.audioPlayback' },
];

export const CAMERA_FACING_OPTIONS: readonly DraftOption<ScrcpyCameraFacing | ''>[] = [
  { value: '', labelKey: 'mirror.option.auto' },
  { value: 'back', labelKey: 'mirror.option.facingBack' },
  { value: 'front', labelKey: 'mirror.option.facingFront' },
  { value: 'external', labelKey: 'mirror.option.facingExternal' },
];

export const CAPTURE_ORIENTATION_OPTIONS: readonly DraftOption<string>[] = [
  { value: '', labelKey: 'mirror.option.orientationNone' },
  { value: 'initial', labelKey: 'mirror.option.orientationInitial' },
  { value: '0', labelKey: 'mirror.option.orientation0' },
  { value: '90', labelKey: 'mirror.option.orientation90' },
  { value: '180', labelKey: 'mirror.option.orientation180' },
  { value: '270', labelKey: 'mirror.option.orientation270' },
];

/** Rotation angles are locale-neutral, so they keep literal labels. */
export const ANGLE_OPTIONS: readonly DraftOption<string>[] = [
  { value: '0', label: '0°' },
  { value: '90', label: '90°' },
  { value: '180', label: '180°' },
  { value: '270', label: '270°' },
];

export const KEYBOARD_MODE_OPTIONS: readonly DraftOption<ScrcpyKeyboardMode>[] = [
  { value: 'inject', labelKey: 'mirror.option.keyboardInject' },
  { value: 'uhid', labelKey: 'mirror.option.keyboardUhid' },
];

export const MOUSE_MODE_OPTIONS: readonly DraftOption<ScrcpyMouseMode>[] = [
  { value: 'touch', labelKey: 'mirror.option.mouseTouch' },
  { value: 'uhid', labelKey: 'mirror.option.mouseUhid' },
];
