import { useEffect, useRef, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { Download, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { PanelShell } from '@/features/connection/PanelShell';
import {
  bugReportMethod,
  downloadBugReport,
  readBugReportState,
  type BugReportMethod,
  type BugReportState,
} from '@/lib/adb/diagnostics';
import { useT, type MessageKey } from '@/lib/i18n';
import { saveToDisk } from '@/lib/utils/download';
import { formatBytes, toErrorMessage } from '@/lib/utils/format';

const METHOD_LABEL_KEYS: Record<BugReportMethod, MessageKey> = {
  stream: 'connection.diagnostics.methodStream',
  file: 'connection.diagnostics.methodFile',
  flat: 'connection.diagnostics.methodFlat',
};

export interface DiagnosticsPanelProps {
  adb: Adb;
}

function Capability({ label, value }: { label: string; value: string | boolean }) {
  const t = useT();
  const enabled = typeof value === 'boolean' ? value : Boolean(value);
  return (
    <div className="flex items-center justify-between gap-2 rounded-[8px] border border-line-soft bg-surface-2 px-2.5 py-1.5">
      <span className="text-[10.5px] text-muted">{label}</span>
      {typeof value === 'boolean' ? (
        <Badge tone={enabled ? 'success' : 'outline'}>
          {enabled ? t('connection.capabilities.supported') : t('common.unsupported')}
        </Badge>
      ) : (
        <span className="min-w-0 truncate font-mono text-[10.5px] font-medium text-ink-soft">{value}</span>
      )}
    </div>
  );
}

export function DiagnosticsPanel({ adb }: DiagnosticsPanelProps) {
  const t = useT();
  const [state, setState] = useState<BugReportState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const next = await readBugReportState(adb);
        if (!disposed) setState(next);
      } catch (cause) {
        if (!disposed) setError(toErrorMessage(cause));
      } finally {
        if (!disposed) setLoading(false);
      }
    })();
    return () => {
      disposed = true;
    };
  }, [adb, attempt]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const generate = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setProgress('');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await downloadBugReport(adb, {
        signal: controller.signal,
        onProgress: (completed, total) => setProgress(`${completed} / ${total}`),
      });
      saveToDisk(result.blob, result.filename);
      toast.success(t('connection.diagnostics.generated', { size: formatBytes(result.bytes) }));
    } catch (cause) {
      if (!controller.signal.aborted) toast.error(toErrorMessage(cause));
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress('');
    }
  };

  const cancel = (): void => {
    abortRef.current?.abort();
  };

  return (
    <PanelShell
      kicker="Diagnostics"
      title={t('connection.diagnostics.title')}
      className="lg:col-span-2"
      action={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('connection.diagnostics.refresh')}
          disabled={loading || busy}
          onClick={() => setAttempt(value => value + 1)}
        >
          {loading ? <Spinner className="size-3.5" /> : <RefreshCw />}
        </Button>
      }
    >
      {error ? (
        <p className="text-[11px] leading-relaxed text-danger">
          {t('connection.diagnostics.readFailed', { error })}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <Capability label="bugreportz" value={state?.version ?? t('common.notAvailable')} />
          <Capability label={t('connection.diagnostics.zipped')} value={state?.zipped ?? false} />
          <Capability label={t('connection.diagnostics.progress')} value={state?.progress ?? false} />
          <Capability label={t('connection.diagnostics.stream')} value={state?.stream ?? false} />
        </div>
        <div className="flex items-center justify-end gap-2">
          {busy ? (
            <Button variant="ghost" size="md" onClick={cancel}>
              <X />
              {t('common.cancel')}
            </Button>
          ) : null}
          <Button variant="primary" size="lg" disabled={loading || busy || !state} onClick={() => void generate()}>
            {busy ? <Spinner className="size-3.5" /> : <Download />}
            {busy ? t('connection.diagnostics.generating') : t('connection.diagnostics.generate')}
          </Button>
        </div>
      </div>

      {busy ? (
        <div className="flex items-center gap-2 rounded-[8px] bg-info-soft px-3 py-2 text-[11px] text-info">
          <Spinner className="size-3.5" />
          <span>{t('connection.diagnostics.busyHint')}</span>
          {progress ? <span className="ml-auto font-mono">{progress}</span> : null}
        </div>
      ) : null}

      <p className="text-[10.5px] leading-relaxed text-muted-2">
        {state
          ? t('connection.diagnostics.footer', {
              method: t(METHOD_LABEL_KEYS[bugReportMethod(state)]),
            })
          : t('connection.diagnostics.detecting')}
      </p>
    </PanelShell>
  );
}
