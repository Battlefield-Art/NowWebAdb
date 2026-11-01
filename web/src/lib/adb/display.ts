import type { Adb } from '@yume-chan/adb';
import { exec } from './shell';
import type { ShellOptions } from './types';
import { t } from '@/lib/i18n';

export interface DisplaySize {
  width: number;
  height: number;
}

/** Reads the current logical display size, preferring an override size. */
export async function readDisplaySize(adb: Adb, options: ShellOptions = {}): Promise<DisplaySize> {
  const result = await exec(adb, 'wm size', { timeout: 5000, ...options });
  const text = `${result.stdout}\n${result.stderr}`;
  const match = /Override size:\s*(\d+)x(\d+)/.exec(text) ?? /Physical size:\s*(\d+)x(\d+)/.exec(text);
  if (!match) throw new Error(t('mirror.adb.displayUnreadable'));
  return { width: Number(match[1]), height: Number(match[2]) };
}
