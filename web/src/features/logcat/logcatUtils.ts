import {
  AndroidLogPriority,
  AndroidLogPriorityToCharacter,
  type AndroidLogEntry,
  LogId,
  logIdName,
} from '@/lib/adb/logcat';
import type { MessageKey } from '@/lib/i18n';

export interface LogFilters {
  minPriority: AndroidLogPriority;
  tag: string;
  search: string;
}

export interface LogLike {
  priority: AndroidLogPriority;
  tag: string;
  message: string;
}

export const LOG_LEVELS: ReadonlyArray<{ value: AndroidLogPriority; label: string }> = [
  { value: AndroidLogPriority.Verbose, label: 'V · Verbose' },
  { value: AndroidLogPriority.Debug, label: 'D · Debug' },
  { value: AndroidLogPriority.Info, label: 'I · Info' },
  { value: AndroidLogPriority.Warn, label: 'W · Warn' },
  { value: AndroidLogPriority.Error, label: 'E · Error' },
  { value: AndroidLogPriority.Fatal, label: 'F · Fatal' },
];

export function priorityCharacter(priority: AndroidLogPriority): string {
  return AndroidLogPriorityToCharacter[priority] ?? '?';
}

/** Buffers offered in the UI; `LogId.All` is handled separately as the "all" choice. */
export const LOG_BUFFERS: ReadonlyArray<{ id: LogId; labelKey: MessageKey }> = [
  { id: LogId.Main, labelKey: 'logcat.buffer.main' },
  { id: LogId.System, labelKey: 'logcat.buffer.system' },
  { id: LogId.Crash, labelKey: 'logcat.buffer.crash' },
  { id: LogId.Radio, labelKey: 'logcat.buffer.radio' },
  { id: LogId.Events, labelKey: 'logcat.buffer.events' },
];

export const DEFAULT_LOG_BUFFERS: readonly LogId[] = [LogId.Main, LogId.System, LogId.Crash];

/** Device-side `-b <pid>` value: only positive integers, anything else means "no filter". */
export function parseCapturePid(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const pid = Number(trimmed);
  return Number.isInteger(pid) && pid > 0 ? pid : undefined;
}

export function buffersToIds(selected: readonly LogId[], all: boolean): readonly LogId[] {
  return all ? [LogId.All] : selected.length ? selected : DEFAULT_LOG_BUFFERS;
}

export function matchesFilters(entry: LogLike, filters: LogFilters): boolean {
  if (entry.priority < filters.minPriority) return false;
  const tag = filters.tag.trim().toLowerCase();
  if (tag && !entry.tag.toLowerCase().includes(tag)) return false;
  const query = filters.search.trim().toLowerCase();
  if (query && !`${entry.tag} ${entry.message}`.toLowerCase().includes(query)) return false;
  return true;
}

export function filterEntries<T extends LogLike>(entries: readonly T[], filters: LogFilters): T[] {
  return entries.filter(entry => matchesFilters(entry, filters));
}

const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

function toDate(timestamp: bigint): Date | null {
  if (timestamp <= 0n) return null;
  return new Date(Number(timestamp / 1_000_000n));
}

export function formatLogClock(timestamp: bigint): string {
  const date = toDate(timestamp);
  if (!date) return '—';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

export function formatLogTime(timestamp: bigint): string {
  const date = toDate(timestamp);
  if (!date) return '—';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
  );
}

export function formatLogLine(entry: AndroidLogEntry): string {
  const time = formatLogTime(entry.timestamp);
  const level = priorityCharacter(entry.priority);
  return `${time} ${level}/${entry.tag}(${entry.pid}:${entry.tid}) ${entry.message}`;
}

export function formatLogText(entries: readonly AndroidLogEntry[]): string {
  return entries.map(entry => formatLogLine(entry)).join('\n');
}

export interface ExportMeta {
  minPriority: AndroidLogPriority;
  tag: string;
  search: string;
  count: number;
  buffers: readonly LogId[];
  pid: number | undefined;
}

/** Comment block that lets an exported file be replayed with the same capture settings. */
export function formatExportHeader(meta: ExportMeta): string {
  return (
    `# NowWebAdb logcat export\n# ${new Date().toISOString()}\n` +
    `# level>=${meta.minPriority} tag="${meta.tag}" search="${meta.search}" entries=${meta.count}\n` +
    `# buffers=${meta.buffers.map(logIdName).join(',')} pid=${meta.pid ?? 'any'}\n\n`
  );
}

export type LogTone = 'muted' | 'info' | 'success' | 'warning' | 'danger';

export function priorityTone(priority: AndroidLogPriority): LogTone {
  if (priority >= AndroidLogPriority.Fatal) return 'danger';
  if (priority >= AndroidLogPriority.Error) return 'danger';
  if (priority >= AndroidLogPriority.Warn) return 'warning';
  if (priority >= AndroidLogPriority.Info) return 'success';
  if (priority >= AndroidLogPriority.Debug) return 'info';
  return 'muted';
}
