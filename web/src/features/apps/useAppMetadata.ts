import { useCallback, useEffect, useRef, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import type { InstalledApp } from '@/lib/adb/packages';
import { mapLimit } from '@/lib/utils/concurrency';
import { clearFailedMetadata, loadAppMetadata, readCachedMetadata } from './metadata';
import type { AppMetadata } from './metadata';

export interface AppMetadataProgress {
  loading: boolean;
  done: number;
  total: number;
}

export interface AppMetadataController {
  entries: Record<string, AppMetadata>;
  progress: AppMetadataProgress;
  retry: () => void;
  cancel: () => void;
}

const IDLE: AppMetadataProgress = { loading: false, done: 0, total: 0 };

export function useAppMetadata(adb: Adb | null, apps: readonly InstalledApp[]): AppMetadataController {
  const [entries, setEntries] = useState<Record<string, AppMetadata>>({});
  const [progress, setProgress] = useState<AppMetadataProgress>(IDLE);
  const [attempt, setAttempt] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!adb) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const cached: Record<string, AppMetadata> = {};
    const pending: InstalledApp[] = [];
    for (const app of apps) {
      const hit = readCachedMetadata(adb, app.packageName);
      if (hit) cached[app.packageName] = hit;
      else pending.push(app);
    }

    const loaded: Record<string, AppMetadata> = {};
    let done = 0;
    let timer: number | undefined;
    const flush = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
      const batch = { ...loaded };
      for (const key of Object.keys(loaded)) delete loaded[key];
      if (Object.keys(batch).length) setEntries(previous => ({ ...previous, ...batch }));
    };
    const schedule = () => {
      if (timer === undefined) timer = window.setTimeout(flush, 120);
    };

    void (async () => {
      setEntries(cached);
      if (!pending.length) {
        setProgress(IDLE);
        return;
      }
      setProgress({ loading: true, done: 0, total: pending.length });
      try {
        await mapLimit(pending, 4, async app => {
          if (controller.signal.aborted) return;
          const metadata = await loadAppMetadata(adb, app, controller.signal);
          if (controller.signal.aborted) return;
          loaded[app.packageName] = metadata;
          done += 1;
          schedule();
        });
      } catch {
        /* Abort is expected when the list is refreshed or the page unmounts. */
      } finally {
        if (!controller.signal.aborted && controllerRef.current === controller) {
          flush();
          setProgress({ loading: false, done, total: pending.length });
          controllerRef.current = null;
        }
      }
    })();

    return () => {
      controller.abort();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [adb, apps, attempt]);

  const retry = useCallback(() => {
    if (adb) clearFailedMetadata(adb);
    setAttempt(value => value + 1);
  }, [adb]);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setProgress(previous => (previous.loading ? { ...previous, loading: false } : previous));
  }, []);

  return { entries, progress, retry, cancel };
}
