import { ArrowDown, ArrowUp } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppAction, InstalledApp } from '@/lib/adb/packages';
import { useT } from '@/lib/i18n';
import { AppRow } from './AppRow';
import type { AppMetadata } from './metadata';

export interface AppTableProps {
  apps: readonly InstalledApp[];
  entries: Record<string, AppMetadata>;
  selected: ReadonlySet<string>;
  ascending: boolean;
  busyPackage: string | null;
  disabled?: boolean;
  resolving: boolean;
  onSortChange: (ascending: boolean) => void;
  onToggle: (packageName: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onDetails: (app: InstalledApp) => void;
  onAction: (app: InstalledApp, action: AppAction) => void;
  onExport: (app: InstalledApp) => void;
  onUninstall: (app: InstalledApp) => void;
}

function HeaderCheckbox({ apps, selected, onToggleAll }: Pick<AppTableProps, 'apps' | 'selected' | 'onToggleAll'>) {
  const t = useT();
  const selectedCount = apps.filter(app => selected.has(app.packageName)).length;
  const all = apps.length > 0 && selectedCount === apps.length;
  return (
    <Checkbox
      checked={all ? true : selectedCount > 0 ? 'indeterminate' : false}
      disabled={!apps.length}
      onCheckedChange={value => onToggleAll(value === true)}
      aria-label={t('apps.table.selectAll')}
    />
  );
}

export function AppTable(props: AppTableProps) {
  const t = useT();
  const { apps, entries, selected, ascending, busyPackage, disabled = false, resolving, onSortChange } = props;
  return (
    <div className="max-h-[calc(100dvh-332px)] min-h-[300px] overflow-auto">
      <table className="w-full table-fixed border-collapse">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-b border-line text-left">
            <th className="w-9 py-2 pl-3 pr-1 font-normal">
              <HeaderCheckbox apps={apps} selected={selected} onToggleAll={props.onToggleAll} />
            </th>
            <th className="py-2 pr-4">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted transition-colors hover:text-ink"
                title={ascending ? t('apps.table.sortAscending') : t('apps.table.sortDescending')}
                onClick={() => onSortChange(!ascending)}
              >
                {t('apps.table.app')}
                {ascending ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
              </button>
            </th>
            <th className="hidden w-[104px] py-2 pr-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted sm:table-cell">
              {t('apps.details.version')}
            </th>
            <th className="hidden w-[92px] py-2 pr-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted md:table-cell">
              {t('apps.table.type')}
            </th>
            <th className="w-[112px] py-2 pr-3 text-right text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">
              {t('apps.table.actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {apps.map(app => (
            <AppRow
              key={app.packageName}
              app={app}
              metadata={entries[app.packageName]}
              resolving={resolving}
              selected={selected.has(app.packageName)}
              busy={disabled || busyPackage === app.packageName}
              onToggle={checked => props.onToggle(app.packageName, checked)}
              onDetails={() => props.onDetails(app)}
              onAction={action => props.onAction(app, action)}
              onExport={() => props.onExport(app)}
              onUninstall={() => props.onUninstall(app)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AppTableSkeleton() {
  return (
    <div className="min-h-[300px]">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-line-soft px-3 py-2.5 last:border-0">
          <Skeleton className="size-3.5 rounded-[4px]" />
          <Skeleton className="size-8 rounded-[9px]" />
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-3 w-36" style={{ width: `${30 + ((index * 13) % 38)}%` }} />
            <Skeleton className="h-2.5 w-56" style={{ width: `${48 + ((index * 9) % 28)}%` }} />
          </div>
          <Skeleton className="hidden h-3 w-16 sm:block" />
          <Skeleton className="h-5 w-9 rounded-md" />
        </div>
      ))}
    </div>
  );
}
