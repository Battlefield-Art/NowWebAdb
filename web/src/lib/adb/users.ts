import type { Adb } from '@yume-chan/adb';
import { exec } from './shell';
import type { ShellOptions } from './types';
import { t } from '@/lib/i18n';

export interface AndroidUser {
  id: number;
  name: string;
  running: boolean;
}

export function parseAndroidUsers(output: string): AndroidUser[] {
  const users: AndroidUser[] = [];
  for (const match of output.matchAll(/UserInfo\{(\d+):([^:}]*)[^}]*\}(\s*running)?/g)) {
    const id = Number(match[1]);
    if (!Number.isInteger(id)) continue;
    users.push({ id, name: match[2]?.trim() || t('apps.user.defaultName', { id: id }), running: Boolean(match[3]) });
  }
  return users;
}

export async function listAndroidUsers(adb: Adb, options: ShellOptions = {}): Promise<AndroidUser[]> {
  const result = await exec(adb, 'pm list users', { timeout: 5000, ...options });
  const users = parseAndroidUsers(`${result.stdout}\n${result.stderr}`);
  return users.length ? users : [{ id: 0, name: t('apps.user.owner'), running: true }];
}
