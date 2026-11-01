import { useEffect, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { DemoModeFields } from '@/features/connection/DemoModeFields';
import { PanelShell } from '@/features/connection/PanelShell';
import { readDemoModeState, setDemoModeEnabled, type DemoModeState } from '@/lib/adb/demoMode';
import { useT } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';

export interface DemoModePanelProps {
  adb: Adb;
}

export function DemoModePanel({ adb }: DemoModePanelProps) {
  const t = useT();
  const [state, setState] = useState<DemoModeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const next = await readDemoModeState(adb);
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

  const toggle = async (checked: boolean): Promise<void> => {
    setBusy(true);
    try {
      await setDemoModeEnabled(adb, checked);
      setState(previous => (previous ? { ...previous, enabled: checked } : previous));
      toast.success(checked ? t('connection.demoMode.enabled') : t('connection.demoMode.disabled'));
    } catch (cause) {
      toast.error(toErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const enabled = state?.enabled ?? false;

  return (
    <PanelShell
      kicker="Demo mode"
      title={t('connection.demoMode.title')}
      className="lg:col-span-2"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('connection.demoMode.refresh')}
            disabled={loading || busy}
            onClick={() => setAttempt(value => value + 1)}
          >
            {loading ? <Spinner className="size-3.5" /> : <RefreshCw />}
          </Button>
          <Switch
            aria-label={t('connection.demoMode.label')}
            checked={enabled}
            disabled={loading || busy}
            onCheckedChange={checked => void toggle(checked)}
          />
        </div>
      }
    >
      {error ? (
        <p className="text-[11px] leading-relaxed text-danger">
          {t('connection.demoMode.readFailed', { error })}
        </p>
      ) : null}

      <p className="text-[10.5px] leading-relaxed text-muted-2">
        {t('connection.demoMode.description')}
      </p>

      {!loading && state && !state.enabled ? (
        <p className="rounded-[8px] border border-dashed border-line-strong px-3 py-2 text-[11px] text-muted">
          {t('connection.demoMode.hint')}
        </p>
      ) : null}

      <DemoModeFields adb={adb} disabled={loading || busy || !enabled} />
    </PanelShell>
  );
}
