import { describe, expect, it } from 'vitest';
import type { AndroidLogEntry } from '@yume-chan/android-bin';
import { AndroidLogPriority } from '@yume-chan/android-bin';
import { LogId, logIdName } from '@/lib/adb/logcat';
import {
  DEFAULT_LOG_BUFFERS,
  buffersToIds,
  filterEntries,
  formatExportHeader,
  formatLogClock,
  formatLogLine,
  formatLogTime,
  matchesFilters,
  parseCapturePid,
  priorityTone,
  type ExportMeta,
} from '@/features/logcat/logcatUtils';

function entry(
  priority: AndroidLogPriority,
  tag: string,
  message: string,
  timestamp = 0n,
): AndroidLogEntry {
  return {
    timestamp,
    priority,
    tag,
    message,
    pid: 123,
    tid: 456,
  } as unknown as AndroidLogEntry;
}

describe('logcat filters', () => {
  const records = [
    entry(AndroidLogPriority.Verbose, 'ActivityManager', 'start proc com.example'),
    entry(AndroidLogPriority.Debug, 'WindowManager', 'relayout Window'),
    entry(AndroidLogPriority.Error, 'ActivityManager', 'ANR in com.example'),
  ];

  it('filters by minimum priority', () => {
    expect(filterEntries(records, { minPriority: AndroidLogPriority.Warn, tag: '', search: '' })).toHaveLength(1);
    expect(filterEntries(records, { minPriority: AndroidLogPriority.Debug, tag: '', search: '' })).toHaveLength(2);
  });

  it('filters by tag substring', () => {
    expect(filterEntries(records, { minPriority: AndroidLogPriority.Verbose, tag: 'manager', search: '' })).toHaveLength(3);
    expect(filterEntries(records, { minPriority: AndroidLogPriority.Verbose, tag: 'window', search: '' })).toHaveLength(1);
  });

  it('searches message and tag', () => {
    expect(filterEntries(records, { minPriority: AndroidLogPriority.Verbose, tag: '', search: 'anr' })).toHaveLength(1);
    expect(filterEntries(records, { minPriority: AndroidLogPriority.Verbose, tag: '', search: 'relayout' })).toHaveLength(1);
    expect(matchesFilters(records[0] as AndroidLogEntry, { minPriority: 0, tag: '', search: 'example' })).toBe(true);
  });

  it('maps priorities to tones', () => {
    expect(priorityTone(AndroidLogPriority.Verbose)).toBe('muted');
    expect(priorityTone(AndroidLogPriority.Debug)).toBe('info');
    expect(priorityTone(AndroidLogPriority.Info)).toBe('success');
    expect(priorityTone(AndroidLogPriority.Warn)).toBe('warning');
    expect(priorityTone(AndroidLogPriority.Error)).toBe('danger');
    expect(priorityTone(AndroidLogPriority.Fatal)).toBe('danger');
  });
});

describe('logcat formatting', () => {
  const local = new Date(2024, 0, 2, 3, 4, 5, 678);
  const timestamp = BigInt(local.getTime()) * 1_000_000n;

  it('formats clock and full time', () => {
    expect(formatLogClock(timestamp)).toBe('03:04:05.678');
    expect(formatLogTime(timestamp)).toBe('2024-01-02 03:04:05.678');
    expect(formatLogClock(0n)).toBe('—');
  });

  it('formats a full log line', () => {
    const line = formatLogLine(entry(AndroidLogPriority.Info, 'TestTag', 'hello', timestamp));
    expect(line).toBe('2024-01-02 03:04:05.678 I/TestTag(123:456) hello');
  });
});

describe('logcat capture options', () => {
  it('accepts only positive integer PIDs', () => {
    expect(parseCapturePid('1234')).toBe(1234);
    expect(parseCapturePid(' 42 ')).toBe(42);
    expect(parseCapturePid('')).toBeUndefined();
    expect(parseCapturePid('abc')).toBeUndefined();
    expect(parseCapturePid('0')).toBeUndefined();
    expect(parseCapturePid('-9')).toBeUndefined();
    expect(parseCapturePid('1.5')).toBeUndefined();
  });

  it('maps buffer selection to log ids', () => {
    expect(buffersToIds([], true)).toEqual([LogId.All]);
    expect(buffersToIds([LogId.Radio], true)).toEqual([LogId.All]);
    expect(buffersToIds([LogId.Radio], false)).toEqual([LogId.Radio]);
    expect(buffersToIds([], false)).toEqual(DEFAULT_LOG_BUFFERS);
  });

  it('names log ids', () => {
    expect(logIdName(LogId.Main)).toBe('Main');
    expect(logIdName(LogId.Events)).toBe('Events');
    expect(logIdName(LogId.All)).toBe('All');
  });

  it('records the capture settings in the export header', () => {
    const meta: ExportMeta = {
      minPriority: AndroidLogPriority.Warn,
      tag: 'AM',
      search: 'anr',
      count: 12,
      buffers: [LogId.Main, LogId.System],
      pid: 4321,
    };
    expect(formatExportHeader(meta)).toContain('# level>=5 tag="AM" search="anr" entries=12');
    expect(formatExportHeader(meta)).toContain('# buffers=Main,System pid=4321');
    expect(formatExportHeader({ ...meta, buffers: [LogId.All], pid: undefined })).toContain(
      '# buffers=All pid=any',
    );
  });
});
