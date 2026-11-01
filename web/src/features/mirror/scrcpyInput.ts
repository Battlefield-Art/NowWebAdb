import { AndroidKeyCode, AndroidKeyEventMeta } from '@yume-chan/scrcpy';
import type { VideoContent } from './videoPadding';

export interface DevicePoint {
  x: number;
  y: number;
}

export interface KeyMessage {
  keyCode: number;
  metaState: number;
  repeat: number;
}

export const NAV_KEYS = {
  back: 'AndroidBack',
  home: 'AndroidHome',
  recents: 'AndroidAppSwitch',
} as const;

const KEY_CODES = AndroidKeyCode as Record<string, number | undefined>;

export function resolveKeyCode(name: string | number): number | undefined {
  return typeof name === 'number' ? name : KEY_CODES[name];
}

/** Maps a viewport point onto the device video coordinate space. */
export function mapVideoPosition(
  clientX: number,
  clientY: number,
  rect: DOMRect | undefined,
  width: number,
  height: number,
): DevicePoint | undefined {
  if (!rect?.width || !rect.height || width <= 0 || height <= 0) return undefined;
  // The canvas is object-fit: contain, so the video is letterboxed inside the stage.
  const scale = Math.min(rect.width / width, rect.height / height);
  const left = rect.left + (rect.width - width * scale) / 2;
  const top = rect.top + (rect.height - height * scale) / 2;
  const x = (clientX - left) / scale;
  const y = (clientY - top) / scale;
  if (x < 0 || y < 0 || x > width || y > height) return undefined;
  return { x: Math.min(width - 1, Math.floor(x)), y: Math.min(height - 1, Math.floor(y)) };
}

/** Maps a viewport point when the cropped video fills the view instead of being letterboxed. */
export function mapFilledPosition(
  clientX: number,
  clientY: number,
  rect: DOMRect | undefined,
  width: number,
  height: number,
  content: VideoContent | undefined,
): DevicePoint | undefined {
  if (!rect?.width || !rect.height || width <= 0 || height <= 0) return undefined;
  const top = content?.top ?? 0;
  const contentHeight = content?.height ?? height;
  const x = ((clientX - rect.left) / rect.width) * width;
  const y = top + ((clientY - rect.top) / rect.height) * contentHeight;
  if (x < 0 || y < top || x > width || y > top + contentHeight) return undefined;
  return {
    x: Math.min(width - 1, Math.floor(x)),
    y: Math.min(top + contentHeight - 1, Math.floor(y)),
  };
}

const EDITABLE = 'input, textarea, select, button, [contenteditable]:not([contenteditable="false"])';
const LOCAL_CTRL_KEYS = new Set(['KeyA', 'KeyC', 'KeyX', 'KeyZ', 'KeyY', 'ControlLeft', 'ControlRight']);
const META_KEYS = [
  ['shiftKey', 'Shift'],
  ['ctrlKey', 'Ctrl'],
  ['altKey', 'Alt'],
  ['metaKey', 'Meta'],
] as const;
const LOCK_KEYS = ['CapsLock', 'NumLock', 'ScrollLock'] as const;

export function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as Element | null;
  return Boolean(element?.closest?.(EDITABLE));
}

export function keyboardMessage(event: KeyboardEvent): KeyMessage | undefined {
  if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return undefined;
  if (isEditableTarget(event.target)) return undefined;
  // Keep browser/OS shortcuts and the fullscreen escape key local.
  if (event.metaKey || event.altKey || /^F\d+$/.test(event.code) || event.code === 'Escape') return undefined;
  if (event.ctrlKey && !LOCAL_CTRL_KEYS.has(event.code)) return undefined;
  const keyCode = KEY_CODES[event.code];
  if (keyCode === undefined) return undefined;
  let metaState = 0;
  for (const [property, flag] of META_KEYS) {
    if (event[property]) metaState |= AndroidKeyEventMeta[flag];
  }
  for (const lock of LOCK_KEYS) {
    if (event.getModifierState?.(lock)) metaState |= AndroidKeyEventMeta[lock];
  }
  return { keyCode, metaState, repeat: event.repeat ? 1 : 0 };
}
