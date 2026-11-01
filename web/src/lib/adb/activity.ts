import { ActivityManager, IntentBuilder, type ActivityManagerStartActivityOptions } from '@yume-chan/android-bin';
import type { Adb } from '@yume-chan/adb';
import { runAppCommand } from './shell';
import type { ShellOptions } from './types';

export { IntentBuilder };
export type { ActivityManagerStartActivityOptions };

export interface ForegroundApp {
  packageName: string;
  activityName: string;
  source: 'activity' | 'top' | 'focus';
}

export async function startActivity(adb: Adb, options: ActivityManagerStartActivityOptions): Promise<void> {
  await new ActivityManager(adb).startActivity(options);
}

export async function startIntent(
  adb: Adb,
  build: (intent: IntentBuilder) => void,
  options: Omit<ActivityManagerStartActivityOptions, 'intent'> = {},
): Promise<void> {
  const intent = new IntentBuilder();
  build(intent);
  await startActivity(adb, { ...options, intent });
}

export async function forceStop(adb: Adb, packageName: string, options?: ShellOptions): Promise<string> {
  return runAppCommand(adb, ['am', 'force-stop', packageName], options);
}

const COMPONENT = /([a-zA-Z][\w.]*)\/([\w.$]+)/;

const SOURCES: ReadonlyArray<{ source: ForegroundApp['source']; command: string }> = [
  { source: 'activity', command: 'dumpsys activity activities 2>/dev/null | grep -m3 -E "mResumedActivity|ResumedActivity"' },
  { source: 'top', command: 'dumpsys activity top 2>/dev/null | head -30' },
  { source: 'focus', command: 'dumpsys window windows 2>/dev/null | grep -m3 -E "mCurrentFocus|mFocusedApp"' },
];

function parseForeground(text: string, source: ForegroundApp['source']): ForegroundApp | null {
  const match = COMPONENT.exec(text);
  if (!match) return null;
  const packageName = match[1];
  const activity = match[2];
  if (!packageName || !activity || !packageName.includes('.')) return null;
  return { packageName, activityName: `${packageName}/${activity}`, source };
}

async function readForegroundCommand(adb: Adb, command: string, signal?: AbortSignal): Promise<string> {
  try {
    const result = await runAppCommand(adb, command, { signal, timeout: 2500 });
    return result;
  } catch {
    return '';
  }
}

export async function getForegroundApp(adb: Adb, signal?: AbortSignal): Promise<ForegroundApp | null> {
  for (const { source, command } of SOURCES) {
    const text = await readForegroundCommand(adb, command, signal);
    const app = text ? parseForeground(text, source) : null;
    if (app) return app;
  }
  return null;
}

export interface ProcessEntry {
  pid: string;
  name: string;
}

export async function listProcesses(adb: Adb, filter = '', options?: ShellOptions): Promise<ProcessEntry[]> {
  const sdk = Number.parseInt(await adb.getProp('ro.build.version.sdk').catch(() => '0'), 10) || 0;
  const command = sdk >= 26 ? 'ps -ef' : 'ps';
  const output = await runAppCommand(adb, command, { timeout: 15000, ...options });
  const processes: ProcessEntry[] = [];
  for (const line of output.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2 || line.includes('grep')) continue;
    const pid = parts[1];
    const name = parts[parts.length - 1];
    if (!pid || !name || !/^\d+$/.test(pid)) continue;
    if (filter && !name.includes(filter)) continue;
    processes.push({ pid, name });
  }
  return processes.sort((a, b) => (a.name === filter ? -1 : b.name === filter ? 1 : 0));
}

export async function clearAppData(adb: Adb, packageName: string, options?: ShellOptions): Promise<string> {
  return runAppCommand(adb, ['pm', 'clear', packageName], options);
}
