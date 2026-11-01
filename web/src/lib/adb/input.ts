import type { Adb } from '@yume-chan/adb';
import { runAppCommand, shellEscape } from './shell';
import type { ShellOptions } from './types';
import { t } from '@/lib/i18n';

export type AndroidKey =
  | 'HOME'
  | 'BACK'
  | 'APP_SWITCH'
  | 'MENU'
  | 'ENTER'
  | 'DEL'
  | 'VOLUME_UP'
  | 'VOLUME_DOWN'
  | 'POWER'
  | 'WAKEUP'
  | 'SLEEP'
  | 'CAMERA'
  | 'MUTE'
  | 'MEDIA_PLAY_PAUSE'
  | 'MEDIA_NEXT'
  | 'MEDIA_PREVIOUS';

export interface TapOptions extends ShellOptions {
  displayId?: number;
}

function displayArgs(displayId?: number): string[] {
  return displayId === undefined ? [] : ['-d', String(displayId)];
}

export async function sendKey(adb: Adb, key: AndroidKey | number, options: ShellOptions = {}): Promise<string> {
  const code = typeof key === 'number' ? String(key) : key;
  return runAppCommand(adb, ['input', 'keyevent', code], options);
}

export async function sendText(adb: Adb, text: string, options: ShellOptions = {}): Promise<string> {
  if (!text) return '';
  const encoded = text.replace(/ /g, '%s');
  return runAppCommand(adb, `input text ${shellEscape(encoded)}`, options);
}

export async function tap(adb: Adb, x: number, y: number, options: TapOptions = {}): Promise<string> {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) throw new Error(t('mirror.adb.invalidTap'));
  const args = ['input', ...displayArgs(options.displayId), 'tap', String(Math.round(x)), String(Math.round(y))];
  return runAppCommand(adb, args, options);
}

export interface SwipeOptions extends TapOptions {
  durationMs?: number;
}

export async function swipe(
  adb: Adb,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  options: SwipeOptions = {},
): Promise<string> {
  const values = [fromX, fromY, toX, toY];
  if (values.some(value => !Number.isFinite(value) || value < 0)) throw new Error(t('mirror.adb.invalidSwipe'));
  const args = ['input', ...displayArgs(options.displayId), 'swipe', ...values.map(value => String(Math.round(value)))];
  if (options.durationMs !== undefined) args.push(String(Math.max(1, Math.round(options.durationMs))));
  return runAppCommand(adb, args, options);
}

export async function longPress(adb: Adb, x: number, y: number, durationMs = 650, options: TapOptions = {}): Promise<string> {
  return swipe(adb, x, y, x, y, { ...options, durationMs });
}
