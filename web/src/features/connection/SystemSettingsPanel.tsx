import { useEffect, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { BatteryCharging, Crosshair, Hand, RefreshCw, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { PanelShell } from '@/features/connection/PanelShell';
import { getSetting, putSetting, type SettingsNamespace } from '@/lib/adb/settings';
import { useT, type MessageKey } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';

interface SettingToggle {
  key: string;
  namespace: SettingsNamespace;
  labelKey: MessageKey;
  hintKey: MessageKey;
  onValue: string;
  icon: LucideIcon;
}

const TOGGLES: readonly SettingToggle[] = [
  {
    key: 'stay_on_while_plugged_in',
    namespace: 'global',
    labelKey: 'connection.settings.stayAwake.label',
    hintKey: 'connection.settings.stayAwake.hint',
    onValue: '7',
    icon: BatteryCharging,
  },
  {
    key: 'show_touches',
    namespace: 'system',
    labelKey: 'connection.settings.showTouches.label',
    hintKey: 'connection.settings.showTouches.hint',
    onValue: '1',
    icon: Hand,
  },
  {
    key: 'pointer_location',
    namespace: 'system',
    labelKey: 'connection.settings.pointerLocation.label',
    hintKey: 'connection.settings.pointerLocation.hint',
    onValue: '1',
    icon: Crosshair,
  },
];

export interface SystemSettingsPanelProps {
  adb: Adb;
}

export function SystemSettingsPanel({ adb }: SystemSettingsPanelProps) {
  const t = useT();
  const [values, setValues] = useState<Record<string, boolean>>({});
  const [unavailable, setUnavailable] = useState<ReadonlySet<string>>(() => new Set());
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      setLoading(true);
      const results = await Promise.all(
        TOGGLES.map(async toggle => {
          try {
            const raw = (await getSetting(adb, toggle.namespace, toggle.key)).trim();
            return [toggle.key, raw !== '' && raw !== '0' && raw !== 'null'] as const;
          } catch {
            return [toggle.key, null] as const;
          }
        }),
      );
      if (disposed) return;
      const next: Record<string, boolean> = {};
      const missing = new Set<string>();
      for (const [key, value] of results) {
        if (value === null) missing.add(key);
        else next[key] = value;
      }
      setValues(next);
      setUnavailable(missing);
      setLoading(false);
    })();
    return () => {
      disposed = true;
    };
  }, [adb, attempt]);

  const change = async (toggle: SettingToggle, checked: boolean): Promise<void> => {
    setBusyKey(toggle.key);
    try {
      await putSetting(adb, toggle.namespace, toggle.key, checked ? toggle.onValue : '0');
      setValues(previous => ({ ...previous, [toggle.key]: checked }));
      toast.success(
        checked
          ? t('connection.settings.changedOn', { label: t(toggle.labelKey) })
          : t('connection.settings.changedOff', { label: t(toggle.labelKey) }),
      );
    } catch (cause) {
      toast.error(toErrorMessage(cause));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <PanelShell
      kicker="Quick settings"
      title={t('connection.settings.title')}
      className="lg:col-span-2"
      action={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('connection.settings.refresh')}
          disabled={loading}
          onClick={() => setAttempt(value => value + 1)}
        >
          {loading ? <Spinner className="size-3.5" /> : <RefreshCw />}
        </Button>
      }
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {TOGGLES.map(toggle => {
          const Icon = toggle.icon;
          const missing = unavailable.has(toggle.key);
          return (
            <div
              key={toggle.key}
              className="flex items-start justify-between gap-3 rounded-[10px] border border-line-soft bg-surface-2 p-3"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-[7px] border border-line-soft bg-surface text-muted-2">
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-ink-soft">{t(toggle.labelKey)}</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
                    {missing ? t('connection.settings.unavailable') : t(toggle.hintKey)}
                  </p>
                </div>
              </div>
              <Switch
                aria-label={t(toggle.labelKey)}
                checked={values[toggle.key] ?? false}
                disabled={loading || missing || busyKey !== null}
                onCheckedChange={checked => void change(toggle, checked)}
              />
            </div>
          );
        })}
      </div>
      <p className="text-[10.5px] leading-relaxed text-muted-2">
        {t('connection.settings.footer')}
      </p>
    </PanelShell>
  );
}
