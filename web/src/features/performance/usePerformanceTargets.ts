import { useCallback, useEffect, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { listProcesses, type ProcessEntry } from '@/lib/adb/activity';
import { listInstalledApps, type InstalledApp } from '@/lib/adb/packages';
import { t } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';

export interface PerformanceTargets {
  apps: InstalledApp[];
  loadingApps: boolean;
  appError: string;
  packageName: string;
  processes: ProcessEntry[];
  pid: string;
  loadingProcesses: boolean;
  processError: string;
  refreshApps: () => void;
  selectPackage: (packageName: string) => void;
  selectPid: (pid: string) => void;
}

export function usePerformanceTargets(adb: Adb | null): PerformanceTargets {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [appError, setAppError] = useState('');
  const [version, setVersion] = useState(0);
  const [packageName, setPackageName] = useState('');
  const [processes, setProcesses] = useState<ProcessEntry[]>([]);
  const [pid, setPid] = useState('');
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  const [processError, setProcessError] = useState('');

  useEffect(() => {
    if (!adb) return;
    const controller = new AbortController();
    void (async () => {
      setLoadingApps(true);
      setAppError('');
      try {
        const list = await listInstalledApps(adb, { scope: 'thirdParty', signal: controller.signal });
        if (!controller.signal.aborted) setApps(list);
      } catch (cause) {
        if (!controller.signal.aborted) setAppError(toErrorMessage(cause));
      } finally {
        if (!controller.signal.aborted) setLoadingApps(false);
      }
    })();
    return () => controller.abort();
  }, [adb, version]);

  useEffect(() => {
    if (!adb || !packageName) return;
    const controller = new AbortController();
    void (async () => {
      setPid('');
      setLoadingProcesses(true);
      setProcessError('');
      try {
        const list = await listProcesses(adb, packageName, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setProcesses(list);
        setPid(list[0]?.pid ?? '');
        if (!list.length) setProcessError(t('performance.error.noProcesses'));
      } catch (cause) {
        if (!controller.signal.aborted) setProcessError(toErrorMessage(cause));
      } finally {
        if (!controller.signal.aborted) setLoadingProcesses(false);
      }
    })();
    return () => controller.abort();
  }, [adb, packageName]);

  const selectPackage = useCallback((name: string) => {
    setPackageName(name);
    setApps(previous => (
      name && !previous.some(app => app.packageName === name)
        ? [...previous, { packageName: name }]
        : previous
    ));
  }, []);

  return {
    apps,
    loadingApps,
    appError,
    packageName,
    processes,
    pid,
    loadingProcesses,
    processError,
    refreshApps: () => setVersion(value => value + 1),
    selectPackage,
    selectPid: setPid,
  };
}
