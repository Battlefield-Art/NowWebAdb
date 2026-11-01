import { useCallback, useEffect, useRef, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import type { AppEnabledFilter, AppScope, InstalledApp } from '@/lib/adb/packages';
import { listInstalledApps } from '@/lib/adb/packages';
import { toErrorMessage } from '@/lib/utils/format';

const SCOPE_KEY = 'nowwebadb.apps.scope';
const ENABLED_KEY = 'nowwebadb.apps.enabled';

function stored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const value = localStorage.getItem(key);
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export interface AppsCatalog {
  apps: InstalledApp[];
  loading: boolean;
  error: string;
  scope: AppScope;
  enabled: AppEnabledFilter;
  search: string;
  ascending: boolean;
  selected: ReadonlySet<string>;
  setScope: (scope: AppScope) => void;
  setEnabled: (enabled: AppEnabledFilter) => void;
  setSearch: (search: string) => void;
  setAscending: (ascending: boolean) => void;
  refresh: () => void;
  toggle: (packageName: string, checked: boolean) => void;
  toggleAll: (packageNames: readonly string[], checked: boolean) => void;
  clearSelection: () => void;
  removeLocal: (packageNames: readonly string[]) => void;
}

export function useAppsCatalog(adb: Adb | null): AppsCatalog {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scope, setScopeState] = useState<AppScope>(() =>
    stored<AppScope>(SCOPE_KEY, ['all', 'thirdParty', 'system'], 'thirdParty'),
  );
  const [enabled, setEnabledState] = useState<AppEnabledFilter>(() =>
    stored<AppEnabledFilter>(ENABLED_KEY, ['all', 'enabled', 'disabled'], 'all'),
  );
  const [search, setSearch] = useState('');
  const [ascending, setAscending] = useState(true);
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
        const list = await listInstalledApps(adb, { scope, enabled, signal: controller.signal });
        if (controller.signal.aborted) return;
        setApps(list);
        const installed = new Set(list.map(app => app.packageName));
        setSelected(previous => {
          const next = new Set([...previous].filter(name => installed.has(name)));
          return next.size === previous.size ? previous : next;
        });
      } catch (cause) {
        if (!controller.signal.aborted) setError(toErrorMessage(cause));
      } finally {
        if (controllerRef.current === controller) {
          setLoading(false);
          controllerRef.current = null;
        }
      }
    })();
    return () => controller.abort();
  }, [adb, scope, enabled, version]);

  const setScope = useCallback((value: AppScope) => {
    localStorage.setItem(SCOPE_KEY, value);
    setScopeState(value);
  }, []);

  const setEnabled = useCallback((value: AppEnabledFilter) => {
    localStorage.setItem(ENABLED_KEY, value);
    setEnabledState(value);
  }, []);

  const refresh = useCallback(() => setVersion(value => value + 1), []);

  const toggle = useCallback((packageName: string, checked: boolean) => {
    setSelected(previous => {
      const next = new Set(previous);
      if (checked) next.add(packageName);
      else next.delete(packageName);
      return next;
    });
  }, []);

  const toggleAll = useCallback((packageNames: readonly string[], checked: boolean) => {
    setSelected(previous => {
      const next = new Set(previous);
      for (const name of packageNames) {
        if (checked) next.add(name);
        else next.delete(name);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const removeLocal = useCallback((packageNames: readonly string[]) => {
    const removed = new Set(packageNames);
    setApps(previous => previous.filter(app => !removed.has(app.packageName)));
    setSelected(previous => {
      const next = new Set([...previous].filter(name => !removed.has(name)));
      return next.size === previous.size ? previous : next;
    });
  }, []);

  return {
    apps,
    loading,
    error,
    scope,
    enabled,
    search,
    ascending,
    selected,
    setScope,
    setEnabled,
    setSearch,
    setAscending,
    refresh,
    toggle,
    toggleAll,
    clearSelection,
    removeLocal,
  };
}
