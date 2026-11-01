import { PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import type { AppAction, InstalledApp } from '@/lib/adb/packages';
import { useT } from '@/lib/i18n';
import { AppTable, AppTableSkeleton } from './AppTable';
import { AppsToolbar, SelectionBar } from './AppsToolbar';
import type { AppExportProgress } from './exportApps';
import type { AppMetadataController } from './useAppMetadata';
import type { AppsCatalog } from './useAppsCatalog';

export interface AppsTableCardProps {
  catalog: AppsCatalog;
  metadata: AppMetadataController;
  metadataErrors: number;
  visibleApps: readonly InstalledApp[];
  busy: boolean;
  busyPackage: string | null;
  batchBusy: boolean;
  exportProgress: AppExportProgress | null;
  onCancelExport: () => void;
  onExport: (packages: readonly string[]) => void;
  onUninstall: (packages: readonly string[]) => void;
  onDetails: (app: InstalledApp) => void;
  onAction: (app: InstalledApp, action: AppAction) => void;
}

export function AppsTableCard(props: AppsTableCardProps) {
  const t = useT();
  const { catalog, metadata, visibleApps, busy, busyPackage, batchBusy, exportProgress } = props;
  return (
    <section className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_1px_0_rgba(22,24,28,0.03)]">
      <AppsToolbar
        search={catalog.search}
        scope={catalog.scope}
        enabled={catalog.enabled}
        busy={busy}
        metadata={metadata.progress}
        metadataErrors={props.metadataErrors}
        onSearchChange={catalog.setSearch}
        onScopeChange={catalog.setScope}
        onEnabledChange={catalog.setEnabled}
        onRefresh={catalog.refresh}
        onMetadataRetry={metadata.retry}
        onMetadataCancel={metadata.cancel}
      />

      {catalog.selected.size > 0 ? (
        <SelectionBar
          count={catalog.selected.size}
          busy={batchBusy}
          exporting={exportProgress !== null}
          onExport={() => props.onExport([...catalog.selected])}
          onUninstall={() => props.onUninstall([...catalog.selected])}
          onClear={catalog.clearSelection}
        />
      ) : null}

      {exportProgress ? (
        <div
          className="flex items-center gap-2 border-b border-line-soft bg-accent-soft/50 px-3 py-2 text-[11px] text-accent-ink"
          role="status"
        >
          <Spinner className="size-3" label={t('apps.export.inProgress')} />
          <span className="truncate">
            {t('apps.export.progress', {
              index: exportProgress.index + 1,
              total: exportProgress.total,
              package: exportProgress.packageName,
              phase: exportProgress.phase,
            })}
          </span>
          <button
            type="button"
            className="ml-auto shrink-0 rounded px-1.5 py-0.5 font-semibold hover:bg-accent-soft"
            onClick={props.onCancelExport}
          >
            {t('common.cancel')}
          </button>
        </div>
      ) : null}

      {catalog.loading ? (
        <AppTableSkeleton />
      ) : catalog.error ? (
        <EmptyState
          icon={<PackageSearch />}
          title={t('apps.card.loadError')}
          description={catalog.error}
          action={
            <Button variant="primary" size="md" onClick={catalog.refresh}>
              {t('apps.card.reload')}
            </Button>
          }
        />
      ) : visibleApps.length === 0 ? (
        <EmptyState
          icon={<PackageSearch />}
          title={catalog.search ? t('apps.card.noMatch') : t('apps.card.empty')}
          description={
            catalog.search ? t('apps.card.noMatchDescription') : t('apps.card.emptyDescription')
          }
          action={
            catalog.search ? (
              <Button variant="outline" size="md" onClick={() => catalog.setSearch('')}>
                {t('apps.card.clearSearch')}
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <AppTable
            apps={visibleApps}
            entries={metadata.entries}
            selected={catalog.selected}
            ascending={catalog.ascending}
            busyPackage={busyPackage}
            disabled={batchBusy}
            resolving={metadata.progress.loading}
            onSortChange={catalog.setAscending}
            onToggle={catalog.toggle}
            onToggleAll={checked => catalog.toggleAll(visibleApps.map(app => app.packageName), checked)}
            onDetails={props.onDetails}
            onAction={props.onAction}
            onExport={app => props.onExport([app.packageName])}
            onUninstall={app => props.onUninstall([app.packageName])}
          />
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft px-3 py-2 text-[10.5px] text-muted">
            <span>{t('apps.card.footer', { visible: visibleApps.length, total: catalog.apps.length })}</span>
            <span className="font-mono text-muted-2">
              {metadata.progress.loading
                ? t('apps.card.metadataProgress', {
                    done: metadata.progress.done,
                    total: metadata.progress.total,
                  })
                : props.metadataErrors > 0
                  ? t('apps.card.metadataErrors', { count: props.metadataErrors })
                  : t('apps.card.metadataReady')}
            </span>
          </footer>
        </>
      )}
    </section>
  );
}
