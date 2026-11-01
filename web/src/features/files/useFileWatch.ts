import { useCallback, useEffect, useRef, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { listDirectory, type RemoteFile } from '@/lib/adb/files';
import { filesSignature } from './fileUtils';

const WATCH_KEY = 'nowwebadb.files.watch';

/** One `adb sync` round trip per check, so the interval stays deliberately long. */
export const FILE_WATCH_INTERVAL = 15_000;

export interface FileWatchSource {
  path: string;
  entries: RemoteFile[];
  loading: boolean;
  refresh: () => void;
}

export interface FileWatch {
  watching: boolean;
  toggleWatch: () => void;
}

function initialWatch(): boolean {
  try {
    return localStorage.getItem(WATCH_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Directory watching. ya-webadb exposes no inotify primitive, so this diffs a
 * `readdir` snapshot against the rendered listing and only refreshes on change.
 */
export function useFileWatch(adb: Adb | null, source: FileWatchSource): FileWatch {
  const { path, entries, loading, refresh } = source;
  const [watching, setWatching] = useState(initialWatch);
  const signatureRef = useRef('');
  const loadingRef = useRef(loading);

  useEffect(() => {
    signatureRef.current = filesSignature(entries);
    loadingRef.current = loading;
  }, [entries, loading]);

  useEffect(() => {
    try {
      localStorage.setItem(WATCH_KEY, watching ? '1' : '0');
    } catch {
      /* storage unavailable (private mode): the switch simply stays session-only */
    }
  }, [watching]);

  useEffect(() => {
    if (!adb || !watching) return;
    const controller = new AbortController();
    let inFlight = false;
    const poll = async () => {
      if (inFlight || controller.signal.aborted || document.hidden || loadingRef.current) return;
      inFlight = true;
      try {
        const listing = await listDirectory(adb, path, { signal: controller.signal });
        if (controller.signal.aborted) return;
        const signature = filesSignature(listing);
        if (signature === signatureRef.current) return;
        signatureRef.current = signature;
        refresh();
      } catch {
        /* a failed check is retried on the next tick; the manual refresh stays authoritative */
      } finally {
        inFlight = false;
      }
    };
    const timer = window.setInterval(() => void poll(), FILE_WATCH_INTERVAL);
    const onVisibility = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [adb, path, watching, refresh]);

  const toggleWatch = useCallback(() => setWatching(previous => !previous), []);

  return { watching, toggleWatch };
}
