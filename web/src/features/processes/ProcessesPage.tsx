import { useState } from 'react';
import { RefreshCw, Search, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SimpleSelect } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import type { DeviceProcess } from '@/lib/adb/processes';
import { useT } from '@/lib/i18n';
import { formatBytes } from '@/lib/utils/format';
import { selectAdb, useDeviceStore } from '@/stores/device';
import { PROCESS_SORT_OPTIONS, useProcesses, type ProcessSort } from './useProcesses';

const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_52px_74px_80px_30px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_60px_100px_92px_34px]';

export default function ProcessesPage() {
  const t = useT();
  const adb = useDeviceStore(selectAdb);
  const list = useProcesses(adb);
  const [target, setTarget] = useState<DeviceProcess | null>(null);

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-2">Processes</p>
          <h1 className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-ink">{t('processes.title')}</h1>
          <p className="mt-1 text-[11.5px] text-muted">{t('processes.description')}</p>
        </div>
        <Button variant="outline" size="md" onClick={list.refresh} disabled={list.loading}>
          {list.loading ? <Spinner className="size-3.5" /> : <RefreshCw />}
          {t('processes.action.refresh')}
        </Button>
      </header>

      <section className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-3 py-2.5">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-[240px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-2" />
              <Input
                value={list.query}
                onChange={event => list.setQuery(event.target.value)}
                placeholder={t('processes.search.placeholder')}
                spellCheck={false}
                className="pl-8"
                aria-label={t('processes.search.aria')}
              />
            </div>
            <SimpleSelect
              value={list.sort}
              onValueChange={value => list.setSort(value as ProcessSort)}
              options={PROCESS_SORT_OPTIONS.map(option => ({
                value: option.value,
                label: t(option.labelKey),
              }))}
              className="w-[140px]"
              aria-label={t('processes.sort.aria')}
            />
          </div>
          <Badge tone="neutral">
            {t('processes.count', { visible: list.visible.length, total: list.total, count: list.total })}
          </Badge>
        </div>

        <div className={`${ROW_GRID} border-b border-line-soft bg-surface-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-2`}>
          <span>{t('processes.table.process')}</span>
          <span className="text-right">PID</span>
          <span className="text-right">{t('processes.table.user')}</span>
          <span className="text-right">{t('processes.table.memory')}</span>
          <span />
        </div>

        {list.error ? (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-4 text-[11.5px] text-danger">
            <span>{list.error}</span>
            <Button variant="outline" size="sm" onClick={list.refresh}>
              {t('common.retry')}
            </Button>
          </div>
        ) : list.loading && list.total === 0 ? (
          <div className="flex items-center justify-center gap-2 px-3 py-10 text-[11.5px] text-muted">
            <Spinner className="size-3.5" />
            {t('processes.loading')}
          </div>
        ) : list.visible.length === 0 ? (
          <div className="px-3 py-10 text-center text-[11.5px] text-muted">
            {list.query ? t('processes.empty.filtered') : t('processes.empty.none')}
          </div>
        ) : (
          <ul className="divide-y divide-line-soft">
            {list.visible.map(process => (
              <li
                key={`${process.pid}:${process.name}`}
                className={`${ROW_GRID} px-3 py-1.5 hover:bg-surface-2`}
              >
                <span className="truncate font-mono text-[11px] text-ink-soft" title={process.name}>
                  {process.name}
                </span>
                <span className="text-right font-mono text-[10.5px] text-muted">{process.pid}</span>
                <span className="truncate text-right font-mono text-[10.5px] text-muted" title={process.user}>
                  {process.user || '—'}
                </span>
                <span className="text-right font-mono text-[10.5px] text-muted-2">
                  {process.rss > 0 ? formatBytes(process.rss) : '—'}
                </span>
                <button
                  type="button"
                  aria-label={t('processes.kill.aria', { name: process.name, pid: process.pid })}
                  title={t('processes.kill.title')}
                  disabled={list.killing !== null}
                  className="grid size-6 place-items-center justify-self-end rounded text-muted-2 transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                  onClick={() => setTarget(process)}
                >
                  {list.killing === process.pid ? <Spinner className="size-3" /> : <Trash2 className="size-3.5" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={open => {
          if (!open) setTarget(null);
        }}
        title={target ? t('processes.confirm.title', { name: target.name }) : t('processes.confirm.fallbackTitle')}
        description={
          target
            ? t('processes.confirm.description', {
                pid: target.pid,
                user: target.user || t('processes.confirm.unknownUser'),
              })
            : ''
        }
        confirmLabel={t('processes.confirm.kill')}
        onConfirm={() => {
          if (target) list.kill(target.pid);
          setTarget(null);
        }}
      />
    </div>
  );
}
