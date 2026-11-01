import {
  AndroidLogPriority,
  AndroidLogPriorityToCharacter,
  Logcat,
  LogcatFormat,
  LogId,
  type AndroidLogEntry,
  type LogSize,
} from '@yume-chan/android-bin';
import type { Adb } from '@yume-chan/adb';

export { AndroidLogPriority, AndroidLogPriorityToCharacter, LogcatFormat, LogId };
export type { AndroidLogEntry, LogSize };

export interface LogcatStreamOptions {
  ids?: readonly LogId[];
  pid?: number;
  dump?: boolean;
  tail?: number | Date;
  minPriority?: AndroidLogPriority;
  signal?: AbortSignal;
}

export function priorityLabel(priority: AndroidLogPriority): string {
  return AndroidLogPriorityToCharacter[priority] ?? '?';
}

/** `AndroidLogEntry.logId` is a raw u32, so unknown values fall back to the number. */
export function logIdName(id: number): string {
  const name = Logcat.logIdToName(id as LogId) as string | undefined;
  return name ?? String(id);
}

export function formatLogEntry(entry: AndroidLogEntry, format: LogcatFormat = LogcatFormat.ThreadTime): string {
  return entry.toString(format);
}

export function createLogcat(adb: Adb): Logcat {
  return new Logcat(adb);
}

export async function consumeLogcat(
  adb: Adb,
  options: LogcatStreamOptions,
  onEntry: (entry: AndroidLogEntry) => void,
): Promise<void> {
  const stream = new Logcat(adb).binary({
    ids: options.ids,
    pid: options.pid,
    dump: options.dump,
    tail: options.tail,
  });
  const reader = stream.getReader();
  const abort = (): void => {
    void reader.cancel().catch(() => {});
  };
  options.signal?.addEventListener('abort', abort, { once: true });
  try {
    for (;;) {
      if (options.signal?.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      if (options.minPriority !== undefined && value.priority < options.minPriority) continue;
      onEntry(value);
    }
  } finally {
    options.signal?.removeEventListener('abort', abort);
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }
}

export async function getLogSize(adb: Adb, ids?: readonly LogId[]): Promise<LogSize[]> {
  return new Logcat(adb).getLogSize(ids);
}

export async function clearLogs(adb: Adb, ids?: readonly LogId[]): Promise<void> {
  await new Logcat(adb).clear(ids);
}
