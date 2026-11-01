import type { Adb } from '@yume-chan/adb';
import { t } from '@/lib/i18n';
import { mapLimit } from '@/lib/utils/concurrency';
import { throwIfAborted } from './async';
import { execText } from './shell';
import type { ShellOptions } from './types';

export async function getProp(adb: Adb, key: string): Promise<string> {
  try {
    return (await adb.getProp(key)).trim();
  } catch {
    return '';
  }
}

export async function getProps(
  adb: Adb,
  keys: readonly string[],
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  const entries = await mapLimit(keys, 6, async key => {
    throwIfAborted(signal);
    return [key, await getProp(adb, key)] as const;
  });
  return Object.fromEntries(entries);
}

const PROP_LINE = /^\[([^\]]+)\]:\s*\[(.*)\]$/;

export function parsePropDump(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const match = PROP_LINE.exec(line.trim());
    if (!match) continue;
    const key = match[1];
    const value = match[2];
    if (key !== undefined && value !== undefined) result[key] = value;
  }
  return result;
}

export async function getAllProps(adb: Adb, options: ShellOptions = {}): Promise<Record<string, string>> {
  const text = await execText(adb, ['getprop'], { timeout: 15000, ...options });
  const props = parsePropDump(text);
  if (Object.keys(props).length === 0) throw new Error(t('overview.error.props'));
  return props;
}
