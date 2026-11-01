import type { Adb } from '@yume-chan/adb';
import { t } from '@/lib/i18n';
import { getBatteryInfo, type BatteryInfo } from './deviceInfo';
import { validatePackageName } from './packages';
import { runAppCommand } from './shell';
import { shellEscape } from './shell';
import type { ShellOptions } from './types';

export interface CpuTicks {
  total: number;
  idle: number;
  process: number;
}

export interface NetworkBytes {
  rx: number;
  tx: number;
}

export interface FrameCounters {
  frames: number;
  janky: number;
}

const PID_MARK = '__NOWWEBADB_CPU_PID__';
const NET_MARK = '__NOWWEBADB_CPU_NET__';
const PID_PATTERN = /^\d+$/;

export function parseCpuLine(text: string): Omit<CpuTicks, 'process'> | null {
  const line = text.split('\n').find(entry => entry.trim().startsWith('cpu '));
  if (!line) return null;
  const fields = line.trim().split(/\s+/).slice(1).map(Number);
  if (fields.length < 7 || fields.some(value => !Number.isFinite(value))) return null;
  const total = fields.slice(0, 7).reduce((sum, value) => sum + value, 0);
  const idle = (fields[3] ?? 0) + (fields[4] ?? 0);
  return { total, idle };
}

export function parseProcessTicks(line: string): number | null {
  const close = line.lastIndexOf(')');
  if (close < 0) return null;
  const fields = line.slice(close + 2).trim().split(/\s+/);
  if (fields.length < 15) return null;
  // After comm: state(0) ... utime(11), stime(12), cutime(13), cstime(14).
  const ticks = fields.slice(11, 15).reduce((sum, value) => sum + Number(value || 0), 0);
  return Number.isFinite(ticks) ? ticks : null;
}

export function parseNetDev(text: string): NetworkBytes | null {
  let rx = 0;
  let tx = 0;
  let found = false;
  for (const line of text.split('\n')) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const name = line.slice(0, colon).trim();
    if (!name || name === 'lo') continue;
    const fields = line.slice(colon + 1).trim().split(/\s+/).map(Number);
    if (fields.length < 9) continue;
    rx += fields[0] ?? 0;
    tx += fields[8] ?? 0;
    found = true;
  }
  return found ? { rx, tx } : null;
}

export function parseMemoryTotalMb(text: string): number | null {
  const match = /TOTAL\s+(?:PSS:)?\s*(\d+)/.exec(text);
  if (!match?.[1]) return null;
  return Math.round((Number(match[1]) / 1024) * 10) / 10;
}

export function parseFrameCounters(text: string): FrameCounters | null {
  const frames = /Total frames rendered:\s*(\d+)/.exec(text);
  if (!frames?.[1]) return null;
  const janky = /Janky frames:\s*(\d+)/.exec(text);
  return { frames: Number(frames[1]), janky: Number(janky?.[1] ?? 0) };
}

export interface CpuNetworkSnapshot {
  cpu: Omit<CpuTicks, 'process'> | null;
  processTicks: number | null;
  network: NetworkBytes | null;
}

export async function readCpuAndNetwork(adb: Adb, pid: string, options?: ShellOptions): Promise<CpuNetworkSnapshot> {
  if (!PID_PATTERN.test(pid)) throw new Error(t('performance.error.invalidPid'));
  const command =
    "cat /proc/stat 2>/dev/null | grep '^cpu '; " +
    `echo ${PID_MARK}; cat /proc/${pid}/stat 2>/dev/null; ` +
    `echo ${NET_MARK}; cat /proc/net/dev 2>/dev/null`;
  const output = await runAppCommand(adb, command, { timeout: 10_000, ...options });
  const [cpuText = '', rest = ''] = output.split(PID_MARK);
  const [pidText = '', netText = ''] = rest.split(NET_MARK);
  return {
    cpu: parseCpuLine(cpuText),
    processTicks: parseProcessTicks(pidText),
    network: parseNetDev(netText),
  };
}

export async function readProcessMemory(adb: Adb, pid: string, options?: ShellOptions): Promise<number | null> {
  if (!PID_PATTERN.test(pid)) throw new Error(t('performance.error.invalidPid'));
  const output = await runAppCommand(adb, ['dumpsys', 'meminfo', pid], { timeout: 12_000, ...options });
  return parseMemoryTotalMb(output);
}

export async function readFrameCounters(adb: Adb, packageName: string, options?: ShellOptions): Promise<FrameCounters | null> {
  validatePackageName(packageName);
  const command = `dumpsys gfxinfo ${shellEscape(packageName)} | grep -E "Total frames rendered|Janky frames" || true`;
  const output = await runAppCommand(adb, command, { timeout: 12_000, ...options });
  return parseFrameCounters(output);
}

export async function readBattery(adb: Adb, signal?: AbortSignal): Promise<BatteryInfo> {
  return getBatteryInfo(adb, signal);
}
