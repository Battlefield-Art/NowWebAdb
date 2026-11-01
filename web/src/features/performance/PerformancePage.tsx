import { useState } from 'react';
import { Download, Play, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getForegroundApp } from '@/lib/adb/activity';
import { useT } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';
import { selectAdb, useDeviceStore } from '@/stores/device';
import { PerformanceCharts } from './PerformanceCharts';
import { PerformanceControls } from './PerformanceControls';
import { PerformanceLive } from './PerformanceLive';
import { downloadPerformanceCsv } from './performanceCsv';
import { usePerformanceMonitor } from './usePerformanceMonitor';
import { usePerformanceTargets } from './usePerformanceTargets';

export default function PerformancePage() {
  const t = useT();
  const adb = useDeviceStore(selectAdb);
  const targets = usePerformanceTargets(adb);
  const [intervalMs, setIntervalMs] = useState('1000');
  const [maxPoints, setMaxPoints] = useState('300');
  const [fetchingCurrent, setFetchingCurrent] = useState(false);
  const monitor = usePerformanceMonitor(adb, {
    packageName: targets.packageName,
    pid: targets.pid,
    intervalMs: Number(intervalMs),
    maxPoints: Number(maxPoints),
  });

  const selectPackage = (packageName: string) => {
    monitor.clear();
    targets.selectPackage(packageName);
  };

  const selectPid = (value: string) => {
    monitor.clear();
    targets.selectPid(value);
  };

  const fetchCurrent = async () => {
    if (!adb) return;
    setFetchingCurrent(true);
    try {
      const app = await getForegroundApp(adb);
      if (!app) {
        toast.warning(t('performance.toast.noForeground'));
        return;
      }
      const known = targets.apps.some(entry => entry.packageName === app.packageName);
      selectPackage(app.packageName);
      toast.success(known
        ? t('performance.toast.selected', { packageName: app.packageName })
        : t('performance.toast.selectedUnknown', { packageName: app.packageName }));
    } catch (cause) {
      toast.error(t('performance.toast.currentFailed', { error: toErrorMessage(cause) }));
    } finally {
      setFetchingCurrent(false);
    }
  };

  const canStart = Boolean(adb && targets.packageName && targets.pid && !targets.loadingProcesses);
  const canExport = monitor.samples.length > 0 && !monitor.monitoring;

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-2">Performance / Monitor</p>
          <h1 className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-ink">{t('performance.title')}</h1>
          <p className="mt-1 text-[11.5px] text-muted">{t('performance.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          {monitor.monitoring ? (
            <Button variant="danger" onClick={monitor.stop}>
              <Square />
              {t('performance.action.stop')}
            </Button>
          ) : (
            <Button variant="primary" disabled={!canStart} onClick={monitor.start}>
              <Play />
              {t('performance.action.start')}
            </Button>
          )}
          <Button
            variant="outline"
            disabled={!canExport}
            onClick={() => downloadPerformanceCsv(monitor.samples, targets.packageName)}
          >
            <Download />
            {t('performance.action.export')}
          </Button>
        </div>
      </header>

      <PerformanceControls
        apps={targets.apps}
        packageName={targets.packageName}
        processes={targets.processes}
        pid={targets.pid}
        intervalMs={intervalMs}
        maxPoints={maxPoints}
        monitoring={monitor.monitoring}
        loadingApps={targets.loadingApps}
        loadingProcesses={targets.loadingProcesses}
        fetchingCurrent={fetchingCurrent}
        appError={targets.appError}
        processError={targets.processError}
        elapsed={monitor.elapsed}
        activeName={targets.packageName}
        onPackage={selectPackage}
        onPid={selectPid}
        onInterval={setIntervalMs}
        onMaxPoints={setMaxPoints}
        onRefresh={targets.refreshApps}
        onCurrent={() => void fetchCurrent()}
      />

      {monitor.error ? (
        <p role="alert" className="rounded-tile border border-warning/30 bg-warning-soft px-3 py-2 text-[11.5px] text-warning">
          {monitor.error}
        </p>
      ) : null}

      {monitor.monitoring || monitor.latest ? (
        <PerformanceLive
          latest={monitor.latest}
          foreground={monitor.foreground}
          activeName={targets.packageName}
          count={monitor.samples.length}
          maxPoints={Number(maxPoints)}
        />
      ) : null}

      <PerformanceCharts samples={monitor.samples} />
    </div>
  );
}
