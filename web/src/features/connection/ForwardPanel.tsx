import { useState } from 'react';
import type { AdbServerClient } from '@yume-chan/adb';
import { ArrowRight, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PanelShell } from '@/features/connection/PanelShell';
import {
  addForwardRule,
  normalizeForwardDeviceAddress,
  normalizeForwardHostAddress,
  removeAllForwardRules,
  removeForwardRule,
  type ForwardRule,
} from '@/lib/adb/forward';
import { useT } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';

export interface ForwardPanelProps {
  server: AdbServerClient | null;
  serial: string;
  rules: ForwardRule[];
  error: string;
  onChanged: () => void;
}

function RuleRow({
  rule,
  busy,
  onRemove,
  onCopy,
}: {
  rule: ForwardRule;
  busy: boolean;
  onRemove: () => void;
  onCopy: () => void;
}) {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-2 rounded-[9px] border border-line-soft bg-surface-2 px-3 py-2">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate font-mono text-[11.5px] font-semibold text-ink">
          <span className="truncate">{rule.local}</span>
          <ArrowRight className="size-3 shrink-0 text-muted-2" />
          <span className="truncate text-muted">{rule.remote}</span>
        </p>
        <p className="mt-0.5 text-[10px] text-muted-2">{t('connection.forward.ruleDirection')}</p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('connection.forward.copyAddress')}
          disabled={busy}
          onClick={onCopy}
        >
          <Copy />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('connection.forward.removeRule')}
          className="text-muted hover:bg-danger-soft hover:text-danger"
          disabled={busy}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

export function ForwardPanel({ server, serial, rules, error, onChanged }: ForwardPanelProps) {
  const t = useT();
  const [hostPort, setHostPort] = useState('8080');
  const [devicePort, setDevicePort] = useState('8080');
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const available = server !== null && serial !== '';

  const add = async () => {
    if (!server) return;
    setBusy(true);
    try {
      const local = normalizeForwardHostAddress(hostPort);
      const remote = normalizeForwardDeviceAddress(devicePort);
      const created = await addForwardRule(server, serial, local, remote);
      toast.success(t('connection.forward.created', { local: created, remote }));
      onChanged();
    } catch (cause) {
      toast.error(toErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (rule: ForwardRule) => {
    if (!server) return;
    setBusy(true);
    try {
      await removeForwardRule(server, serial, rule.local);
      toast.success(t('connection.forward.removed', { name: rule.local }));
      onChanged();
    } catch (cause) {
      toast.error(toErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    setConfirmClear(false);
    if (!server) return;
    setBusy(true);
    try {
      await removeAllForwardRules(server, serial);
      toast.success(t('connection.forward.cleared'));
      onChanged();
    } catch (cause) {
      toast.error(toErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const copy = (value: string) => {
    void navigator.clipboard
      .writeText(value)
      .then(() => toast.success(t('connection.forward.copied')))
      .catch(() => toast.error(t('connection.forward.clipboardDenied')));
  };

  return (
    <PanelShell
      kicker="Host forward"
      title={t('connection.forward.title')}
      action={
        <div className="flex items-center gap-2">
          <Badge tone={rules.length > 0 ? 'accent' : 'neutral'}>
            {t('connection.forward.count', { count: rules.length })}
          </Badge>
          {available && rules.length > 0 ? (
            <Button variant="danger-ghost" size="sm" disabled={busy} onClick={() => setConfirmClear(true)}>
              {t('common.clear')}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-2">
        {rules.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-line-strong bg-surface-2 px-4 py-5 text-center">
            <p className="text-[12px] font-semibold text-ink-soft">{t('connection.forward.emptyTitle')}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">{t('connection.forward.emptyHint')}</p>
          </div>
        ) : (
          rules.map(rule => (
            <RuleRow
              key={`${rule.serial}-${rule.local}`}
              rule={rule}
              busy={busy}
              onRemove={() => void remove(rule)}
              onCopy={() => copy(rule.local)}
            />
          ))
        )}
      </div>

      {error ? <p className="text-[11px] leading-relaxed text-danger">{error}</p> : null}

      {available ? (
        <div className="mt-auto grid gap-2 border-t border-line-soft pt-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label={t('connection.forward.hostPort')} htmlFor="forward-host">
            <Input
              id="forward-host"
              value={hostPort}
              inputMode="numeric"
              disabled={busy}
              onChange={event => setHostPort(event.target.value)}
            />
          </Field>
          <Field label={t('connection.forward.devicePort')} htmlFor="forward-device">
            <Input
              id="forward-device"
              value={devicePort}
              disabled={busy}
              onChange={event => setDevicePort(event.target.value)}
            />
          </Field>
          <Button variant="outline" size="lg" disabled={busy} onClick={() => void add()}>
            {t('connection.forward.create')}
          </Button>
          <p className="text-[10.5px] leading-relaxed text-muted-2 sm:col-span-3">
            {t('connection.forward.autoPortHint')} {t('connection.forward.loopbackHint')}
          </p>
        </div>
      ) : (
        <p className="mt-auto border-t border-line-soft pt-3 text-[10.5px] leading-relaxed text-muted-2">
          {t('connection.forward.serverOnly')}
        </p>
      )}

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title={t('connection.forward.clearTitle', { count: rules.length })}
        description={t('connection.forward.clearDescription')}
        confirmLabel={t('common.clear')}
        onConfirm={() => void clearAll()}
      />
    </PanelShell>
  );
}
