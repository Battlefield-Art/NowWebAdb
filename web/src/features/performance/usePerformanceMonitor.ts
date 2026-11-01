import { useCallback, useEffect, useRef, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import type { ForegroundApp } from '@/lib/adb/activity';
import { t } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';
import { PerformanceSampler, type PerformanceSample } from './performanceSampler';

export interface PerformanceConfig {
  packageName: string;
  pid: string;
  intervalMs: number;
  maxPoints: number;
}

export interface PerformanceMonitor {
  samples: PerformanceSample[];
  monitoring: boolean;
  elapsed: number;
  foreground: ForegroundApp | null;
  error: string;
  latest: PerformanceSample | null;
  start: () => void;
  stop: () => void;
  clear: () => void;
}

function cap(samples: PerformanceSample[], maxPoints: number): PerformanceSample[] {
  return maxPoints > 0 ? samples.slice(-maxPoints) : samples;
}

function hasData(sample: PerformanceSample): boolean {
  return [sample.cpuApp, sample.memoryMB, sample.fps, sample.rxKbps, sample.batteryLevel]
    .some(value => value !== null);
}

export function usePerformanceMonitor(adb: Adb | null, config: PerformanceConfig): PerformanceMonitor {
  const { packageName, pid, intervalMs, maxPoints } = config;
  const [samples, setSamples] = useState<PerformanceSample[]>([]);
  const [monitoring, setMonitoring] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [foreground, setForeground] = useState<ForegroundApp | null>(null);
  const [error, setError] = useState('');
  const startedAt = useRef(0);
  const maxRef = useRef(maxPoints);

  useEffect(() => {
    maxRef.current = maxPoints;
  }, [maxPoints]);

  useEffect(() => {
    if (!monitoring) return;
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [monitoring]);

  useEffect(() => {
    if (!adb || !monitoring || !pid || !packageName) return;
    const controller = new AbortController();
    const sampler = new PerformanceSampler(adb, pid, packageName);
    let busy = false;
    const tick = async () => {
      if (busy || controller.signal.aborted) return;
      busy = true;
      try {
        const result = await sampler.sample(controller.signal);
        if (controller.signal.aborted) return;
        setSamples(previous => cap([...previous, result.sample], maxRef.current));
        setForeground(result.foreground);
        setError(hasData(result.sample) ? '' : t('performance.error.noData'));
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(t('performance.error.sampleFailed', { error: toErrorMessage(cause) }));
        }
      } finally {
        busy = false;
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), intervalMs);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [adb, monitoring, pid, packageName, intervalMs]);

  const start = useCallback(() => {
    if (!pid || !packageName) return;
    startedAt.current = Date.now();
    setSamples([]);
    setForeground(null);
    setError('');
    setElapsed(0);
    setMonitoring(true);
  }, [pid, packageName]);

  const stop = useCallback(() => setMonitoring(false), []);
  const clear = useCallback(() => {
    setSamples([]);
    setForeground(null);
    setError('');
    setElapsed(0);
  }, []);

  return {
    samples: cap(samples, maxPoints),
    monitoring,
    elapsed,
    foreground,
    error,
    latest: samples.at(-1) ?? null,
    start,
    stop,
    clear,
  };
}
