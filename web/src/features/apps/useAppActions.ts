import { useCallback, useEffect, useRef, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { toast } from 'sonner';
import type { AppAction, InstalledApp } from '@/lib/adb/packages';
import { performAppAction, uninstallApp } from '@/lib/adb/packages';
import { useT, type MessageKey } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';
import { saveToDisk } from '@/lib/utils/download';
import { exportSelectedApps } from './exportApps';
import type { AppExportProgress } from './exportApps';
import { clearMetadataCache } from './metadata';
import type { AppMetadata } from './metadata';

const ACTION_MESSAGES: Record<AppAction, MessageKey> = {
  launch: 'apps.action.launched',
  stop: 'apps.action.stopped',
  enable: 'apps.action.enabled',
  disable: 'apps.action.disabled',
  details: 'apps.action.detailsRead',
};

export interface UseAppActionsOptions {
  adb: Adb | null;
  entries: Record<string, AppMetadata>;
  removeLocal: (packageNames: readonly string[]) => void;
  refresh: () => void;
}

export function useAppActions({ adb, entries, removeLocal, refresh }: UseAppActionsOptions) {
  const t = useT();
  const [installOpen, setInstallOpen] = useState(false);
  const [busyPackage, setBusyPackage] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [exportProgress, setExportProgress] = useState<AppExportProgress | null>(null);
  const [confirmPackages, setConfirmPackages] = useState<readonly string[] | null>(null);
  const exportController = useRef<AbortController | null>(null);

  useEffect(() => () => exportController.current?.abort(), []);

  const runAction = useCallback(
    async (app: InstalledApp, action: AppAction) => {
      if (!adb) return;
      setBusyPackage(app.packageName);
      try {
        await performAppAction(adb, app.packageName, action);
        toast.success(
          t('apps.action.success', {
            message: t(ACTION_MESSAGES[action]),
            name: entries[app.packageName]?.appName || app.packageName,
          }),
        );
      } catch (cause) {
        toast.error(toErrorMessage(cause));
      } finally {
        setBusyPackage(null);
      }
    },
    [adb, entries, t],
  );

  const exportPackages = useCallback(
    async (packages: readonly string[]) => {
      if (!adb || !packages.length || exportController.current) return;
      const controller = new AbortController();
      exportController.current = controller;
      setExportProgress({
        index: 0,
        total: packages.length,
        packageName: packages[0] ?? '',
        phase: t('apps.export.phase.preparing'),
        loaded: 0,
      });
      try {
        const result = await exportSelectedApps(adb, packages, { signal: controller.signal, onProgress: setExportProgress });
        saveToDisk(result.blob, result.filename);
        toast.success(
          packages.length === 1
            ? t('apps.export.single')
            : t('apps.export.multiple', { count: packages.length }),
        );
      } catch (cause) {
        if (!controller.signal.aborted) toast.error(toErrorMessage(cause));
      } finally {
        if (exportController.current === controller) exportController.current = null;
        setExportProgress(null);
      }
    },
    [adb, t],
  );

  const cancelExport = useCallback(() => exportController.current?.abort(), []);

  const uninstallPackages = useCallback(
    async (packages: readonly string[], keepData = false) => {
      if (!adb || !packages.length) return;
      setConfirmPackages(null);
      setBatchBusy(packages.length > 1);
      setBusyPackage(packages.length === 1 ? (packages[0] ?? null) : null);
      const removed: string[] = [];
      const failures: string[] = [];
      try {
        for (const packageName of packages) {
          try {
            await uninstallApp(adb, packageName, { keepData });
            clearMetadataCache(adb, packageName);
            removed.push(packageName);
          } catch (cause) {
            failures.push(t('apps.uninstall.failure', { package: packageName, message: toErrorMessage(cause) }));
          }
        }
      } finally {
        setBatchBusy(false);
        setBusyPackage(null);
      }
      removeLocal(removed);
      if (removed.length) {
        toast.success(
          keepData
            ? t('apps.uninstall.successKeepData', { count: removed.length })
            : t('apps.uninstall.success', { count: removed.length }),
        );
      }
      for (const failure of failures) toast.error(failure);
    },
    [adb, removeLocal, t],
  );

  const handleInstalled = useCallback(() => {
    if (adb) clearMetadataCache(adb);
    refresh();
  }, [adb, refresh]);

  return {
    installOpen,
    setInstallOpen,
    busyPackage,
    batchBusy,
    exportProgress,
    confirmPackages,
    setConfirmPackages,
    runAction,
    exportPackages,
    cancelExport,
    uninstallPackages,
    handleInstalled,
  };
}
