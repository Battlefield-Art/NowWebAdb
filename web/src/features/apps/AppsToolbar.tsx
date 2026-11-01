import { RefreshCw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import type { AppEnabledFilter, AppScope } from '@/lib/adb/packages';
import { useT, type MessageKey } from '@/lib/i18n';
import type { AppMetadataProgress } from './useAppMetadata';

const SCOPES: ReadonlyArray<{ value: AppScope; labelKey: MessageKey }> = [
  { value: 'thirdParty', labelKey: 'apps.scope.thirdParty' },
  { value: 'system', labelKey: 'apps.scope.system' },
  { value: 'all', labelKey: 'apps.scope.all' },
];

const ENABLED: ReadonlyArray<{ value: AppEnabledFilter; labelKey: MessageKey }> = [
  { value: 'all', labelKey: 'apps.enabled.all' },
  { value: 'enabled', labelKey: 'apps.enabled.enabled' },
  { value: 'disabled', labelKey: 'apps.enabled.disabled' },
];

export interface AppsToolbarProps {
  search: string;
  scope: AppScope;
  enabled: AppEnabledFilter;
  busy: boolean;
  metadata: AppMetadataProgress;
  metadataErrors: number;
  onSearchChange: (value: string) => void;
  onScopeChange: (value: AppScope) => void;
  onEnabledChange: (value: AppEnabledFilter) => void;
  onRefresh: () => void;
  onMetadataRetry: () => void;
  onMetadataCancel: () => void;
}

export function AppsToolbar(props: AppsToolbarProps) {
  const t = useT();
  const { metadata, metadataErrors } = props;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-3 py-2.5">
      <Input
        className="h-8 w-full min-w-[168px] flex-1 sm:max-w-[300px]"
        leading={<Search />}
        trailing={
          props.search ? (
            <button
              type="button"
              aria-label={t('apps.card.clearSearch')}
              className="grid size-5 place-items-center rounded text-muted-2 transition-colors hover:bg-surface-3 hover:text-ink"
              onClick={() => props.onSearchChange('')}
            >
              <X className="size-3" />
            </button>
          ) : null
        }
        value={props.search}
        placeholder={t('apps.toolbar.searchPlaceholder')}
        aria-label={t('apps.toolbar.search')}
        onChange={event => props.onSearchChange(event.target.value)}
      />

      <div className="flex items-center rounded-control border border-line-strong bg-surface">
        <Select value={props.scope} onValueChange={value => props.onScopeChange(value as AppScope)}>
          <SelectTrigger aria-label={t('apps.toolbar.scope')} className="h-8 rounded-r-none border-r border-line-soft">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCOPES.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {t(item.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={props.enabled} onValueChange={value => props.onEnabledChange(value as AppEnabledFilter)}>
          <SelectTrigger aria-label={t('apps.toolbar.enabled')} className="h-8 rounded-l-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENABLED.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {t(item.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        {metadata.loading ? (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[10.5px] text-muted"
          >
            <Spinner className="size-3" label={t('apps.toolbar.metadataLoading')} />
            <span className="tabular-nums">
              {t('apps.toolbar.metadataProgress', { done: metadata.done, total: metadata.total })}
            </span>
            <button
              type="button"
              aria-label={t('apps.toolbar.metadataCancel')}
              className="grid size-4 place-items-center rounded-full transition-colors hover:bg-surface-3 hover:text-ink"
              onClick={props.onMetadataCancel}
            >
              <X className="size-2.5" />
            </button>
          </span>
        ) : metadataErrors > 0 ? (
          <Button variant="ghost" size="sm" onClick={props.onMetadataRetry}>
            {t('apps.toolbar.metadataFailed', { count: metadataErrors })}
          </Button>
        ) : metadata.total > 0 && metadata.done < metadata.total ? (
          <Button variant="ghost" size="sm" onClick={props.onMetadataRetry}>
            {t('apps.toolbar.metadataContinue')}
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={props.onRefresh}
          disabled={props.busy}
          aria-label={t('apps.toolbar.refresh')}
          title={t('apps.toolbar.refresh')}
        >
          <RefreshCw />
        </Button>
      </div>
    </div>
  );
}

export interface SelectionBarProps {
  count: number;
  busy: boolean;
  exporting: boolean;
  onExport: () => void;
  onUninstall: () => void;
  onClear: () => void;
}

export function SelectionBar({ count, busy, exporting, onExport, onUninstall, onClear }: SelectionBarProps) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line-soft bg-surface-2 px-3 py-2">
      <span className="text-[11.5px] font-semibold text-ink-soft">
        {t('apps.selection.count', { count })}
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        <Button size="sm" variant="outline" disabled={busy || exporting} onClick={onExport}>
          {exporting ? <Spinner className="size-3" /> : null}
          {t('apps.actions.exportApks')}
        </Button>
        <Button size="sm" variant="danger-ghost" disabled={busy || exporting} onClick={onUninstall}>
          {t('apps.selection.uninstall')}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy || exporting} onClick={onClear}>
          {t('common.clear')}
        </Button>
      </div>
    </div>
  );
}
