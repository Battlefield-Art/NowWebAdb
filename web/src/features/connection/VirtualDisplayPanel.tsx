import { useEffect, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { MonitorSmartphone, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { PanelShell } from '@/features/connection/PanelShell';
import { readOverlayDisplays, writeOverlayDisplays, type OverlayDisplayDevice } from '@/lib/adb/overlayDisplay';
import { useT, type MessageKey } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';

export interface VirtualDisplayPanelProps {
  adb: Adb;
}

function validMode(mode: { width: number; height: number; density: number }): boolean {
  const inRange = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;
  return (
    inRange(mode.width, 320, 8192) &&
    inRange(mode.height, 320, 8192) &&
    inRange(mode.density, 72, 1000)
  );
}

function flagsOf(device: OverlayDisplayDevice): MessageKey[] {
  const flags: MessageKey[] = [];
  if (device.secure) flags.push('connection.virtualDisplay.flagSecure');
  if (device.ownContentOnly) flags.push('connection.virtualDisplay.flagOwnContent');
  if (device.showSystemDecorations) flags.push('connection.virtualDisplay.flagDecorations');
  return flags;
}

export function VirtualDisplayPanel({ adb }: VirtualDisplayPanelProps) {
  const t = useT();
  const [devices, setDevices] = useState<OverlayDisplayDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const next = await readOverlayDisplays(adb);
        if (!disposed) setDevices(next);
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

  const save = async (next: OverlayDisplayDevice[], message: string): Promise<void> => {
    setBusy(true);
    try {
      await writeOverlayDisplays(adb, next);
      setDevices(next);
      toast.success(message);
    } catch (cause) {
      toast.error(toErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelShell
      kicker="Virtual displays"
      title={t('connection.virtualDisplay.title')}
      className="lg:col-span-2"
      action={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('connection.virtualDisplay.refresh')}
          disabled={loading || busy}
          onClick={() => setAttempt(value => value + 1)}
        >
          {loading ? <Spinner className="size-3.5" /> : <RefreshCw />}
        </Button>
      }
    >
      {error ? (
        <p className="text-[11px] leading-relaxed text-danger">
          {t('connection.virtualDisplay.readFailed', { error })}
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="grid gap-2">
          {devices.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-[8px] border border-dashed border-line-strong px-3 py-4 text-[11px] text-muted">
              <MonitorSmartphone className="size-4 shrink-0 text-muted-2" />
              {t('connection.virtualDisplay.empty')}
            </div>
          ) : (
            devices.map((device, index) => (
              <DeviceRow
                key={index}
                device={device}
                index={index}
                busy={busy}
                onRemove={() =>
                  void save(devices.filter((_, position) => position !== index), t('connection.virtualDisplay.removed'))
                }
              />
            ))
          )}
        </div>

        <CreateForm
          busy={busy}
          disabled={loading}
          onAdd={device => void save([...devices, device], t('connection.virtualDisplay.added'))}
        />
      </div>

      <p className="text-[10.5px] leading-relaxed text-muted-2">
        {t('connection.virtualDisplay.footer')}
      </p>
    </PanelShell>
  );
}

interface DeviceRowProps {
  device: OverlayDisplayDevice;
  index: number;
  busy: boolean;
  onRemove: () => void;
}

function DeviceRow({ device, index, busy, onRemove }: DeviceRowProps) {
  const t = useT();
  return (
    <div className="flex items-start justify-between gap-3 rounded-[8px] border border-line-soft bg-surface-2 px-2.5 py-2">
      <div className="min-w-0">
        <p className="text-[11.5px] font-semibold text-ink-soft">
          {t('connection.virtualDisplay.itemTitle', { index: index + 1 })}
        </p>
        <p className="mt-0.5 break-all font-mono text-[10.5px] text-muted">
          {device.modes.map(mode => `${mode.width}×${mode.height} @ ${mode.density}dpi`).join(' · ')}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {flagsOf(device).map(flag => (
            <Badge key={flag} tone="outline">
              {t(flag)}
            </Badge>
          ))}
        </div>
      </div>
      <Button
        variant="danger-ghost"
        size="icon-sm"
        aria-label={t('connection.virtualDisplay.remove', { index: index + 1 })}
        disabled={busy}
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

interface CreateFormProps {
  busy: boolean;
  disabled: boolean;
  onAdd: (device: OverlayDisplayDevice) => void;
}

function CreateForm({ busy, disabled, onAdd }: CreateFormProps) {
  const t = useT();
  const [width, setWidth] = useState('1080');
  const [height, setHeight] = useState('1920');
  const [density, setDensity] = useState('420');
  const [secure, setSecure] = useState(false);
  const [ownContentOnly, setOwnContentOnly] = useState(false);
  const [decorations, setDecorations] = useState(true);

  const submit = (): void => {
    const mode = { width: Number(width), height: Number(height), density: Number(density) };
    if (!validMode(mode)) {
      toast.error(t('connection.virtualDisplay.invalid'));
      return;
    }
    onAdd({ modes: [mode], secure, ownContentOnly, showSystemDecorations: decorations });
  };

  return (
    <div className="grid gap-2 rounded-[10px] border border-line-soft bg-surface-2 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">
        {t('connection.virtualDisplay.createTitle')}
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        <Field label={t('connection.virtualDisplay.width')}>
          <Input type="number" min={320} max={8192} value={width} onChange={event => setWidth(event.target.value)} />
        </Field>
        <Field label={t('connection.virtualDisplay.height')}>
          <Input type="number" min={320} max={8192} value={height} onChange={event => setHeight(event.target.value)} />
        </Field>
        <Field label="DPI">
          <Input type="number" min={72} max={1000} value={density} onChange={event => setDensity(event.target.value)} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-[11px] text-ink-soft">
        <Checkbox checked={secure} onCheckedChange={value => setSecure(value === true)} />
        {t('connection.virtualDisplay.secure')}
      </label>
      <label className="flex items-center gap-2 text-[11px] text-ink-soft">
        <Checkbox checked={ownContentOnly} onCheckedChange={value => setOwnContentOnly(value === true)} />
        {t('connection.virtualDisplay.ownContent')}
      </label>
      <label className="flex items-center gap-2 text-[11px] text-ink-soft">
        <Checkbox checked={decorations} onCheckedChange={value => setDecorations(value === true)} />
        {t('connection.virtualDisplay.decorations')}
      </label>
      <Button variant="primary" size="md" disabled={busy || disabled} onClick={submit}>
        {busy ? <Spinner className="size-3.5" /> : <Plus />}
        {t('connection.virtualDisplay.add')}
      </Button>
    </div>
  );
}

