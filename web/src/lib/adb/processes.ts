import type { Adb } from '@yume-chan/adb';
import { t } from '@/lib/i18n';
import { exec } from './shell';
import type { ShellOptions } from './types';

export interface DeviceProcess {
  user: string;
  pid: number;
  ppid: number;
  /** Resident set size in bytes. */
  rss: number;
  name: string;
}

const PRIMARY_COMMAND = 'ps -A -o USER,PID,PPID,RSS,NAME';
const FALLBACK_COMMAND = 'ps';

/** Parses toybox/toolbox `ps` output by locating the header columns. */
export function parseProcessList(output: string): DeviceProcess[] {
  const lines = output.split('\n').map(line => line.trimEnd()).filter(line => line.trim());
  const headerIndex = lines.findIndex(line => /(^|\s)PID(\s|$)/.test(line) && /(^|\s)NAME(\s|$)/.test(line));
  const header = lines[headerIndex]?.trim().split(/\s+/);
  if (!header) return [];
  const column = (name: string) => header.indexOf(name);
  const pidIndex = column('PID');
  const nameIndex = column('NAME');
  if (pidIndex < 0 || nameIndex < 0) return [];
  const userIndex = column('USER');
  const ppidIndex = column('PPID');
  const rssIndex = column('RSS');

  const processes: DeviceProcess[] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length <= nameIndex) continue;
    const pid = Number(parts[pidIndex]);
    if (!Number.isSafeInteger(pid) || pid <= 0) continue;
    processes.push({
      user: userIndex >= 0 ? (parts[userIndex] ?? '') : '',
      pid,
      ppid: ppidIndex >= 0 ? Number(parts[ppidIndex]) || 0 : 0,
      rss: rssIndex >= 0 ? (Number(parts[rssIndex]) || 0) * 1024 : 0,
      name: parts[nameIndex] ?? '',
    });
  }
  return processes;
}

export async function listProcesses(adb: Adb, options: ShellOptions = {}): Promise<DeviceProcess[]> {
  const primary = await exec(adb, PRIMARY_COMMAND, { timeout: 8000, ...options });
  const parsed = parseProcessList(primary.stdout);
  if (parsed.length) return parsed;
  const fallback = await exec(adb, FALLBACK_COMMAND, { timeout: 8000, ...options });
  return parseProcessList(fallback.stdout);
}

export async function killProcess(adb: Adb, pid: number, options: ShellOptions = {}): Promise<void> {
  if (!Number.isInteger(pid) || pid <= 1) throw new Error(t('processes.error.invalidPid'));
  const result = await exec(adb, `kill -9 ${pid}`, { timeout: 5000, ...options });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || result.stdout || t('processes.error.killFailed', { pid }));
  }
}
