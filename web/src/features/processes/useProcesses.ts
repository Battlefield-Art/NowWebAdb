import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { toast } from 'sonner';
import { killProcess, listProcesses, type DeviceProcess } from '@/lib/adb/processes';
import { t, type MessageKey } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';

export type ProcessSort = 'memory' | 'name' | 'pid';

export const PROCESS_SORT_OPTIONS: ReadonlyArray<{ value: ProcessSort; labelKey: MessageKey }> = [
  { value: 'memory', labelKey: 'processes.sort.memory' },
  { value: 'name', labelKey: 'processes.sort.name' },
  { value: 'pid', labelKey: 'processes.sort.pid' },
];

export interface ProcessesController {
  total: number;
  visible: DeviceProcess[];
  loading: boolean;
  error: string;
  killing: number | null;
  query: string;
  sort: ProcessSort;
  setQuery: (value: string) => void;
  setSort: (value: ProcessSort) => void;
  refresh: () => void;
  kill: (pid: number) => void;
}

export function useProcesses(adb: Adb | null): ProcessesController {
  const [data, setData] = useState<{ adb: Adb; list: DeviceProcess[] }>();
  const [revision, setRevision] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [killing, setKilling] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ProcessSort>('memory');

  useEffect(() => {
    if (!adb) return;
    let active = true;
    void listProcesses(adb)
      .then(list => {
        if (!active) return;
        setData({ adb, list });
        setError('');
      })
      .catch(cause => {
        if (active) setError(toErrorMessage(cause));
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [adb, revision]);

  const refresh = useCallback(() => {
    if (!adb) return;
    setRefreshing(true);
    setError('');
    setRevision(value => value + 1);
  }, [adb]);

  const processes = useMemo(() => (data && data.adb === adb ? data.list : []), [adb, data]);
  const loading = Boolean(adb) && (refreshing || !data || data.adb !== adb);

  const kill = useCallback(
    (pid: number) => {
      if (!adb || killing !== null) return;
      setKilling(pid);
      void killProcess(adb, pid)
        .then(() => toast.success(t('processes.toast.killed', { pid })))
        .catch(cause => toast.error(toErrorMessage(cause)))
        .finally(() => {
          setKilling(null);
          setRefreshing(true);
          setRevision(value => value + 1);
        });
    },
    [adb, killing],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? processes.filter(
          process =>
            process.name.toLowerCase().includes(needle) ||
            process.user.toLowerCase().includes(needle) ||
            String(process.pid).includes(needle),
        )
      : processes;
    return [...filtered].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'pid') return a.pid - b.pid;
      return b.rss - a.rss;
    });
  }, [processes, query, sort]);

  return {
    total: processes.length,
    visible,
    loading,
    error,
    killing,
    query,
    sort,
    setQuery,
    setSort,
    refresh,
    kill,
  };
}
