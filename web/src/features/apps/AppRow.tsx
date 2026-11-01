import { Ban, CheckCircle2, Download, Info, MoreHorizontal, Play, Square, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppAction, InstalledApp } from '@/lib/adb/packages';
import { useT } from '@/lib/i18n';
import { AppIcon } from './AppIcon';
import { isSystemApp } from './appUtils';
import type { AppMetadata } from './metadata';

export interface AppRowProps {
  app: InstalledApp;
  metadata: AppMetadata | undefined;
  resolving: boolean;
  selected: boolean;
  busy: boolean;
  onToggle: (checked: boolean) => void;
  onDetails: () => void;
  onAction: (action: AppAction) => void;
  onExport: () => void;
  onUninstall: () => void;
}

export function AppRow({ app, metadata, resolving, selected, busy, onToggle, onDetails, onAction, onExport, onUninstall }: AppRowProps) {
  const t = useT();
  const label = metadata?.appName || app.packageName;
  const pending = !metadata && resolving;
  return (
    <tr
      className={`group border-b border-line-soft last:border-0 transition-colors ${
        selected ? 'bg-accent-soft/45' : 'hover:bg-surface-2'
      }`}
    >
      <td className="pl-3 pr-1 align-middle">
        <Checkbox
          checked={selected}
          onCheckedChange={value => onToggle(value === true)}
          aria-label={t('apps.row.select', { name: label })}
        />
      </td>
      <td className="py-2 pr-4 align-middle">
        <div className="flex min-w-0 items-center gap-2.5">
          <AppIcon packageName={app.packageName} label={label} src={metadata?.icon} />
          <div className="min-w-0 flex-1">
            {pending ? (
              <div className="grid gap-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-44" />
              </div>
            ) : (
              <>
                <p className="truncate text-[12.5px] font-semibold leading-tight text-ink" title={label}>
                  {label}
                </p>
                <p className="mt-0.5 truncate font-mono text-[10px] leading-tight text-muted" title={app.packageName}>
                  {metadata ? app.packageName : t('apps.row.metadataPending')}
                </p>
              </>
            )}
          </div>
        </div>
      </td>
      <td className="hidden w-[104px] py-2 pr-3 align-middle sm:table-cell">
        <p className="truncate font-mono text-[11px] text-ink-soft" title={metadata?.versionName || '—'}>
          {metadata?.versionName || '—'}
        </p>
        <p className="mt-0.5 font-mono text-[10px] text-muted-2">{metadata?.versionCode ?? app.versionCode ?? '—'}</p>
      </td>
      <td className="hidden w-[92px] py-2 pr-3 align-middle md:table-cell">
        <Badge tone={isSystemApp(app) ? 'neutral' : 'accent'}>
          {isSystemApp(app) ? t('apps.badge.system') : t('apps.badge.user')}
        </Badge>
      </td>
      <td className="w-[112px] py-2 pr-3 align-middle">
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={onDetails} disabled={busy}>
            {t('common.details')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" disabled={busy} aria-label={t('apps.row.more', { name: label })}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onAction('launch')}>
                <Play className="size-3.5" />
                {t('apps.row.launch')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction('stop')}>
                <Square className="size-3.5" />
                {t('apps.row.forceStop')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onDetails}>
                <Info className="size-3.5" />
                {t('apps.row.fullDetails')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onExport}>
                <Download className="size-3.5" />
                {t('apps.actions.exportApks')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onAction('enable')}>
                <CheckCircle2 className="size-3.5" />
                {t('apps.row.enable')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction('disable')}>
                <Ban className="size-3.5" />
                {t('apps.row.disable')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger" onSelect={onUninstall}>
                <Trash2 className="size-3.5" />
                {t('apps.uninstall.confirm')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}
