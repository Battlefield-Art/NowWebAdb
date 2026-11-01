import { useMemo, useState } from 'react';
import { Archive, Upload } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { InstalledApp } from '@/lib/adb/packages';
import { useT } from '@/lib/i18n';
import { selectAdb, useDeviceStore } from '@/stores/device';
import { AppDetailsDialog } from './AppDetailsDialog';
import { AppsTableCard } from './AppsTableCard';
import { InstallDialog } from './InstallDialog';
import { useAppActions } from './useAppActions';
import { useAppMetadata } from './useAppMetadata';
import { useAppsCatalog } from './useAppsCatalog';

function sortByName(
  apps: readonly InstalledApp[],
  nameOf: (app: InstalledApp) => string,
  ascending: boolean,
): InstalledApp[] {
  return [...apps].sort((left, right) => {
    const result = nameOf(left).localeCompare(nameOf(right), 'zh-Hans-CN', { sensitivity: 'base' });
    return ascending ? result : -result;
  });
}

export default function AppsPage() {
  const t = useT();
  const adb = useDeviceStore(selectAdb);
  const catalog = useAppsCatalog(adb);
  const metadata = useAppMetadata(adb, catalog.apps);
  const actions = useAppActions({
    adb,
    entries: metadata.entries,
    removeLocal: catalog.removeLocal,
    refresh: catalog.refresh,
  });
  const [detailsApp, setDetailsApp] = useState<InstalledApp | null>(null);
  const [keepData, setKeepData] = useState(false);

  const visibleApps = useMemo(() => {
    const query = catalog.search.trim().toLowerCase();
    const matched = catalog.apps.filter(app => {
      if (!query) return true;
      return (
        app.packageName.toLowerCase().includes(query) ||
        (metadata.entries[app.packageName]?.appName.toLowerCase() ?? '').includes(query)
      );
    });
    const nameOf = (app: InstalledApp) => metadata.entries[app.packageName]?.appName || app.packageName;
    return sortByName(matched, nameOf, catalog.ascending);
  }, [catalog.apps, catalog.search, catalog.ascending, metadata.entries]);

  const metadataErrors = useMemo(
    () => Object.values(metadata.entries).filter(entry => entry.error).length,
    [metadata.entries],
  );
  const busy = actions.batchBusy || actions.busyPackage !== null || actions.exportProgress !== null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-2">{t('apps.page.eyebrow')}</p>
          <h1 className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-ink">{t('apps.page.title')}</h1>
          <p className="mt-1 text-[11.5px] text-muted">
            {catalog.loading
              ? t('apps.page.loading')
              : catalog.search
                ? t('apps.page.summaryFiltered', { total: catalog.apps.length, matched: visibleApps.length })
                : t('apps.page.summary', { count: catalog.apps.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="lg"
            disabled={busy || catalog.selected.size === 0}
            onClick={() => void actions.exportPackages([...catalog.selected])}
          >
            <Archive />
            {t('apps.page.exportSelected')}
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={catalog.loading || busy}
            onClick={() => actions.setInstallOpen(true)}
          >
            <Upload />
            {t('apps.page.installApk')}
          </Button>
        </div>
      </div>

      <AppsTableCard
        catalog={catalog}
        metadata={metadata}
        metadataErrors={metadataErrors}
        visibleApps={visibleApps}
        busy={busy}
        busyPackage={actions.busyPackage}
        batchBusy={actions.batchBusy}
        exportProgress={actions.exportProgress}
        onCancelExport={actions.cancelExport}
        onExport={packages => void actions.exportPackages(packages)}
        onUninstall={actions.setConfirmPackages}
        onDetails={setDetailsApp}
        onAction={(app, action) => void actions.runAction(app, action)}
      />

      <InstallDialog
        adb={adb}
        open={actions.installOpen}
        onOpenChange={actions.setInstallOpen}
        onInstalled={actions.handleInstalled}
      />
      <AppDetailsDialog
        adb={adb}
        app={detailsApp}
        metadata={detailsApp ? metadata.entries[detailsApp.packageName] : undefined}
        onOpenChange={open => {
          if (!open) setDetailsApp(null);
        }}
      />
      <ConfirmDialog
        open={actions.confirmPackages !== null}
        onOpenChange={open => {
          if (!open) {
            actions.setConfirmPackages(null);
            setKeepData(false);
          }
        }}
        title={t('apps.uninstall.title', { count: actions.confirmPackages?.length ?? 0 })}
        description={
          keepData ? t('apps.uninstall.descriptionKeepData') : t('apps.uninstall.description')
        }
        confirmLabel={keepData ? t('apps.uninstall.confirmKeepData') : t('apps.uninstall.confirm')}
        onConfirm={() => {
          if (actions.confirmPackages) void actions.uninstallPackages(actions.confirmPackages, keepData);
        }}
      >
        <label className="flex items-center gap-2 text-[11.5px] text-ink-soft">
          <Checkbox checked={keepData} onCheckedChange={value => setKeepData(value === true)} />
          {t('apps.uninstall.keepDataLabel')}
        </label>
      </ConfirmDialog>
    </div>
  );
}
