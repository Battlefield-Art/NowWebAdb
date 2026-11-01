import { useCallback, useEffect, useRef, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { listDirectory, type RemoteFile } from '@/lib/adb/files';
import { normalizeRemotePath, parentRemotePath } from '@/lib/adb/paths';
import { toErrorMessage } from '@/lib/utils/format';

const PATH_KEY = 'nowwebadb.files.path';
const DEFAULT_PATH = '/sdcard';

function initialPath(): string {
  try {
    const stored = localStorage.getItem(PATH_KEY);
    return stored ? normalizeRemotePath(stored) : DEFAULT_PATH;
  } catch {
    return DEFAULT_PATH;
  }
}

export interface FilesController {
  path: string;
  entries: RemoteFile[];
  loading: boolean;
  error: string;
  query: string;
  selected: ReadonlySet<string>;
  setQuery: (query: string) => void;
  navigate: (path: string) => void;
  goUp: () => void;
  refresh: () => void;
  toggle: (path: string, checked: boolean) => void;
  toggleAll: (paths: readonly string[], checked: boolean) => void;
  clearSelection: () => void;
  removeLocal: (paths: readonly string[]) => void;
}

export function useFiles(adb: Adb | null): FilesController {
  const [path, setPath] = useState(initialPath);
  const [entries, setEntries] = useState<RemoteFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [version, setVersion] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!adb) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const list = await listDirectory(adb, path, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setEntries(list);
        const available = new Set(list.map(entry => entry.path));
        setSelected(previous => {
          const next = new Set([...previous].filter(item => available.has(item)));
          return next.size === previous.size ? previous : next;
        });
      } catch (cause) {
        if (!controller.signal.aborted) {
          setEntries([]);
          setError(toErrorMessage(cause));
        }
      } finally {
        if (controllerRef.current === controller) {
          setLoading(false);
          controllerRef.current = null;
        }
      }
    })();
    return () => controller.abort();
  }, [adb, path, version]);

  const navigate = useCallback((next: string) => {
    const normalized = normalizeRemotePath(next);
    localStorage.setItem(PATH_KEY, normalized);
    setSelected(new Set());
    setQuery('');
    setPath(normalized);
  }, []);

  const goUp = useCallback(() => {
    if (path !== '/') navigate(parentRemotePath(path));
  }, [navigate, path]);

  const refresh = useCallback(() => setVersion(value => value + 1), []);

  const toggle = useCallback((target: string, checked: boolean) => {
    setSelected(previous => {
      const next = new Set(previous);
      if (checked) next.add(target);
      else next.delete(target);
      return next;
    });
  }, []);

  const toggleAll = useCallback((paths: readonly string[], checked: boolean) => {
    setSelected(previous => {
      const next = new Set(previous);
      for (const item of paths) {
        if (checked) next.add(item);
        else next.delete(item);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const removeLocal = useCallback((paths: readonly string[]) => {
    const removed = new Set(paths);
    setEntries(previous => previous.filter(entry => !removed.has(entry.path)));
    setSelected(previous => {
      const next = new Set([...previous].filter(item => !removed.has(item)));
      return next.size === previous.size ? previous : next;
    });
  }, []);

  return {
    path,
    entries,
    loading,
    error,
    query,
    selected,
    setQuery,
    navigate,
    goUp,
    refresh,
    toggle,
    toggleAll,
    clearSelection,
    removeLocal,
  };
}
