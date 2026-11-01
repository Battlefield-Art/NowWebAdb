import type { Adb } from '@yume-chan/adb';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { PanelShell } from '@/features/connection/PanelShell';
import { useCapabilities } from '@/features/connection/useCapabilities';
import { useT } from '@/lib/i18n';

export interface CapabilitiesPanelProps {
  adb: Adb;
}

function Value({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 rounded-[8px] bg-surface-2 px-2.5 py-1.5">
      <span className="shrink-0 text-[10.5px] text-muted">{label}</span>
      <span className="min-w-0 break-all text-right font-mono text-[10.5px] font-medium text-ink-soft">
        {value}
      </span>
    </div>
  );
}

export function CapabilitiesPanel({ adb }: CapabilitiesPanelProps) {
  const t = useT();
  const { data, loading, error, refresh } = useCapabilities(adb);
  const flag = (value: boolean | null | undefined): string => {
    if (value === null || value === undefined) return t('connection.capabilities.notRead');
    return value ? t('connection.capabilities.supported') : t('common.unsupported');
  };

  return (
    <PanelShell
      kicker="Protocol"
      title={t('connection.capabilities.title')}
      className="lg:col-span-2"
      action={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('connection.capabilities.refresh')}
          onClick={refresh}
          disabled={loading}
        >
          {loading ? <Spinner className="size-3.5" /> : <RefreshCw />}
        </Button>
      }
    >
      {error ? (
        <p className="text-[11px] leading-relaxed text-danger">
          {t('connection.capabilities.readFailed', { error })}
        </p>
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <Value
              label={t('connection.capabilities.device')}
              value={data.model || data.product || data.device || data.serial}
            />
            <Value label={t('connection.capabilities.state')} value={data.state} />
            <Value label={t('connection.capabilities.maxPayload')} value={`${data.maxPayloadSize} B`} />
            <Value
              label="Shell"
              value={data.subprocess.shell ? 'Shell v2' : t('connection.capabilities.noneProtocol')}
            />
            <Value label={t('connection.capabilities.cmdService')} value={flag(data.subprocess.cmd)} />
            <Value label="ABB / ABB exec" value={`${flag(data.subprocess.abb)} / ${flag(data.subprocess.abbExec)}`} />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-2">
                {t('connection.capabilities.features')}
              </span>
              <span className="text-[10px] text-muted-2">
                {t('connection.capabilities.available', {
                  supported: data.features.filter(item => item.supported).length,
                  total: data.features.length,
                })}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {data.features.map(item => (
                <Badge
                  key={item.feature}
                  tone={item.supported ? 'success' : 'outline'}
                  title={item.label}
                  className="font-mono"
                >
                  {item.feature}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 border-t border-line-soft pt-2 sm:grid-cols-4">
            <Value label="stat v2" value={flag(data.sync?.statV2)} />
            <Value label="ls v2" value={flag(data.sync?.listV2)} />
            <Value label="send/recv v2" value={flag(data.sync?.sendReceiveV2)} />
            <Value label={t('connection.capabilities.fixedPushMkdir')} value={flag(data.sync?.fixedPushMkdir)} />
          </div>

          <p className="text-[10.5px] leading-relaxed text-muted-2">
            {t('connection.capabilities.footer')}
          </p>
        </>
      ) : loading ? (
        <div className="flex items-center gap-2 py-4 text-[11.5px] text-muted">
          <Spinner className="size-3.5" />
          {t('connection.capabilities.loading')}
        </div>
      ) : null}
    </PanelShell>
  );
}
