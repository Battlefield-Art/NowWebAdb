import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemoteFile } from '@/lib/adb/files';
import { FILE_WATCH_INTERVAL, useFileWatch } from '@/features/files/useFileWatch';

const { listDirectory } = vi.hoisted(() => ({ listDirectory: vi.fn() }));

vi.mock('@/lib/adb/files', () => ({ listDirectory }));

function entry(name: string, options: Partial<RemoteFile> = {}): RemoteFile {
  return {
    name,
    path: `/sdcard/${name}`,
    size: 1,
    mtime: new Date(0),
    isDirectory: false,
    isLink: false,
    permission: 0o644,
    ...options,
  };
}

const adb = {} as never;
const signals: AbortSignal[] = [];

function captureSignal(args: unknown[]): void {
  const signal = (args[2] as { signal?: AbortSignal } | undefined)?.signal;
  if (signal) signals.push(signal);
}

function renderWatch(entries: RemoteFile[], refresh = vi.fn()) {
  const view = renderHook(() =>
    useFileWatch(adb, { path: '/sdcard', entries, loading: false, refresh }),
  );
  return { refresh, ...view };
}

async function tick(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(FILE_WATCH_INTERVAL);
  });
}

function setHidden(value: boolean): void {
  Object.defineProperty(document, 'hidden', { configurable: true, writable: false, value });
}

describe('useFileWatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    signals.length = 0;
    localStorage.clear();
    setHidden(false);
    listDirectory.mockImplementation((...args: unknown[]) => {
      captureSignal(args);
      return Promise.resolve([entry('a.txt', { size: 1 })]);
    });
  });

  it('stays off by default and remembers the choice', () => {
    const { result } = renderWatch([entry('a.txt')]);
    expect(result.current.watching).toBe(false);
    expect(localStorage.getItem('nowwebadb.files.watch')).toBe('0');

    act(() => result.current.toggleWatch());
    expect(result.current.watching).toBe(true);
    expect(localStorage.getItem('nowwebadb.files.watch')).toBe('1');
  });

  it('does not poll while watching is off', async () => {
    renderWatch([entry('a.txt')]);
    await tick();
    expect(listDirectory).not.toHaveBeenCalled();
  });

  it('refreshes only when the listing actually changed', async () => {
    const { result, refresh } = renderWatch([entry('a.txt', { size: 1 })]);
    act(() => result.current.toggleWatch());

    await tick();
    expect(listDirectory).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();

    listDirectory.mockImplementation(() => Promise.resolve([entry('a.txt', { size: 9 })]));
    await tick();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('skips polling while hidden and checks again once the tab is visible', async () => {
    const { result } = renderWatch([entry('a.txt')]);
    act(() => result.current.toggleWatch());

    setHidden(true);
    await tick();
    expect(listDirectory).not.toHaveBeenCalled();

    setHidden(false);
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(listDirectory).toHaveBeenCalledTimes(1);
  });

  it('never overlaps polls', async () => {
    let release: (value: RemoteFile[]) => void = () => {
      throw new Error('listing promise never settled');
    };
    listDirectory.mockImplementation(
      (...args: unknown[]) =>
        new Promise<RemoteFile[]>(resolve => {
          captureSignal(args);
          release = resolve;
        }),
    );

    const { result } = renderWatch([entry('a.txt')]);
    act(() => result.current.toggleWatch());

    await tick();
    await tick();
    expect(listDirectory).toHaveBeenCalledTimes(1);

    release([entry('a.txt'), entry('b.txt')]);
    await act(async () => {
      await Promise.resolve();
    });
    expect(signals[0]?.aborted).toBe(false);

    await tick();
    expect(listDirectory).toHaveBeenCalledTimes(2);
  });

  it('aborts the in-flight check on unmount', async () => {
    listDirectory.mockImplementation(
      (...args: unknown[]) =>
        new Promise<RemoteFile[]>(() => {
          captureSignal(args);
          /* never settles */
        }),
    );

    const { result, unmount } = renderWatch([entry('a.txt')]);
    act(() => result.current.toggleWatch());
    await tick();
    expect(signals).toHaveLength(1);

    unmount();
    expect(signals[0]?.aborted).toBe(true);
  });
});
