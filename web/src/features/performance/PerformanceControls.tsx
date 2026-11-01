import { Crosshair, RefreshCw } from 'lucide-react';
import type { ProcessEntry } from '@/lib/adb/activity';
import type { InstalledApp } from '@/lib/adb/packages';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { SimpleSelect } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useT, type MessageKey } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';

export interface PerformanceControlsProps {
  apps: readonly InstalledApp[];
  packageName: string;
  processes: readonly ProcessEntry[];
  pid: string;
  intervalMs: string;
  maxPoints: string;
  monitoring: boolean;
  loadingApps: boolean;
  loadingProcesses: boolean;
  fetchingCurrent: boolean;
  appError: string;
  processError: string;
  elapsed: number;
  activeName: string;
  onPackage: (value: string) => void;
  onPid: (value: string) => void;
  onInterval: (value: string) => void;
  onMaxPoints: (value: string) => void;
  onRefresh: () => void;
  onCurrent: () => void;
}

interface LabeledOption {
  value: string;
  labelKey: MessageKey;
  count?: number;
}

const INTERVAL_OPTIONS: readonly LabeledOption[] = [
  { value: '1000', labelKey: 'performance.interval.seconds', count: 1 },
  { value: '2000', labelKey: 'performance.interval.seconds', count: 2 },
  { value: '5000', labelKey: 'performance.interval.seconds', count: 5 },
  { value: '10000', labelKey: 'performance.interval.seconds', count: 10 },
];

const MAX_OPTIONS: readonly LabeledOption[] = [
  { value: '300', labelKey: 'performance.maxPoints.default', count: 300 },
  { value: '500', labelKey: 'performance.maxPoints.option', count: 500 },
  { value: '1000', labelKey: 'performance.maxPoints.option', count: 1000 },
  { value: '2000', labelKey: 'performance.maxPoints.option', count: 2000 },
  { value: '5000', labelKey: 'performance.maxPoints.option', count: 5000 },
  { value: '0', labelKey: 'performance.maxPoints.unlimited' },
];

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours, minutes, rest].map(value => String(value).padStart(2, '0')).join(':');
}

export function PerformanceControls(props: PerformanceControlsProps) {
  const t = useT();
  const { monitoring } = props;
  const labeled = (items: readonly LabeledOption[]) =>
    items.map(item => ({
      value: item.value,
      label: t(item.labelKey, item.count === undefined ? undefined : { count: item.count }),
    }));
  return (
    <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">Configuration</p>
          <span className="text-[10.5px] text-muted-2">{t('performance.controls.sampleHint')}</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label={t('performance.field.app')}>
            <SimpleSelect
              aria-label={t('performance.field.app')}
              value={props.packageName}
              onValueChange={props.onPackage}
              disabled={monitoring}
              placeholder={
                props.loadingApps
                  ? t('performance.placeholder.loadingApps')
                  : t('performance.placeholder.selectApp')
              }
              options={props.apps.map(app => ({ value: app.packageName, label: app.packageName }))}
            />
          </Field>
          <Field label={t('performance.field.process')} hint={props.processError || undefined}>
            <SimpleSelect
              aria-label={t('performance.field.process')}
              value={props.pid}
              onValueChange={props.onPid}
              disabled={monitoring || props.loadingProcesses || props.processes.length === 0}
              placeholder={
                props.loadingProcesses
                  ? t('performance.placeholder.loadingProcesses')
                  : props.packageName
                    ? t('performance.placeholder.noProcess')
                    : t('performance.placeholder.selectAppFirst')
              }
              options={props.processes.map(item => ({
                value: item.pid,
                label: `${item.name} · PID ${item.pid}`,
              }))}
            />
          </Field>
          <Field label={t('performance.field.interval')}>
            <SimpleSelect
              aria-label={t('performance.field.interval')}
              value={props.intervalMs}
              onValueChange={props.onInterval}
              disabled={monitoring}
              options={labeled(INTERVAL_OPTIONS)}
            />
          </Field>
          <Field label={t('performance.field.maxPoints')} hint={t('performance.field.maxPointsHint')}>
            <SimpleSelect
              aria-label={t('performance.field.maxPoints')}
              value={props.maxPoints}
              onValueChange={props.onMaxPoints}
              disabled={monitoring}
              options={labeled(MAX_OPTIONS)}
            />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
          <Button variant="outline" size="md" disabled={monitoring || props.loadingApps} onClick={props.onRefresh}>
            <RefreshCw className={cn(props.loadingApps && 'animate-spin')} />
            {t('performance.action.refreshApps')}
          </Button>
          <Button
            variant="outline"
            size="md"
            disabled={monitoring || props.fetchingCurrent}
            onClick={props.onCurrent}
          >
            {props.fetchingCurrent ? <Spinner /> : <Crosshair />}
            {t('performance.action.currentApp')}
          </Button>
          {props.appError ? <span className="text-[11px] text-danger">{props.appError}</span> : null}
        </div>
      </div>

      <aside
        className={cn(
          'flex min-h-[168px] flex-col justify-between rounded-card border p-4 shadow-card',
          monitoring ? 'border-bay-line bg-bay text-bay-text' : 'border-line bg-surface text-ink',
        )}
      >
        <div className="flex items-center justify-between">
          <span className={cn('mono text-[10px] font-semibold uppercase tracking-[0.16em]', monitoring ? 'text-bay-accent' : 'text-muted-2')}>
            {monitoring ? 'Recording' : 'Standby'}
          </span>
          <span className={cn('size-1.5 rounded-full', monitoring ? 'bg-bay-accent' : 'bg-muted-2')} />
        </div>
        <div>
          <p className={cn('truncate text-[13px] font-semibold', monitoring ? 'text-bay-text' : 'text-ink-soft')}>
            {monitoring ? props.activeName : t('performance.status.notStarted')}
          </p>
          <p className={cn('mono mt-1 text-[22px] font-semibold tracking-tight', monitoring ? 'text-bay-text' : 'text-muted-2')}>
            {monitoring ? formatDuration(props.elapsed) : '--:--:--'}
          </p>
        </div>
        <p className={cn('text-[11px] leading-relaxed', monitoring ? 'text-bay-muted' : 'text-muted')}>
          {monitoring ? t('performance.status.recordingHint') : t('performance.status.idleHint')}
        </p>
      </aside>
    </section>
  );
}
