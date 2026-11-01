import type { AdbServerClient } from '@yume-chan/adb';
import { Link2, RadioTower, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { MdnsServiceList } from '@/features/home/MdnsServiceList';
import type { ConnectionTask } from '@/features/home/useConnectionTask';
import { useWirelessPairing } from '@/features/home/useWirelessPairing';
import { useT } from '@/lib/i18n';

export interface WirelessPanelProps {
  task: ConnectionTask;
  getClient: () => AdbServerClient;
  onChanged: () => Promise<void>;
}

export function WirelessPanel({ task, getClient, onChanged }: WirelessPanelProps) {
  const t = useT();
  const wireless = useWirelessPairing(task, getClient, onChanged);

  return (
    <div className="grid gap-4 border-t border-line-soft pt-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-[12.5px] font-bold text-ink">
            <Wifi className="size-3.5 text-accent" />
            {t('home.wireless.title')}
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            {t('home.wireless.lead')}
          </p>
        </div>
        {wireless.services.length ? (
          <Badge tone="neutral">
            {t('home.wireless.serviceCount', { count: wireless.services.length })}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="md" disabled={task.busy} onClick={wireless.discover}>
          <RadioTower />
          {t('home.wireless.discover')}
        </Button>
        <span className="text-[10.5px] text-muted-2">{t('home.wireless.discoverHint')}</span>
      </div>
      <MdnsServiceList
        services={wireless.services}
        note={wireless.note}
        busy={task.busy}
        onPick={wireless.pick}
        onConnect={service => wireless.connect(service.address)}
      />

      <form
        className="grid gap-3 sm:grid-cols-[1fr_120px_auto] sm:items-end"
        onSubmit={event => {
          event.preventDefault();
          wireless.pair();
        }}
      >
        <Field label={t('home.wireless.pairAddress')} htmlFor="pair-address">
          <Input
            id="pair-address"
            value={wireless.pairAddress}
            onChange={event => wireless.setPairAddress(event.target.value)}
            placeholder="192.168.1.20:37123"
            inputMode="url"
          />
        </Field>
        <Field label={t('home.wireless.pairCode')} htmlFor="pair-code">
          <Input
            id="pair-code"
            value={wireless.pairCode}
            onChange={event => wireless.setPairCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={t('home.wireless.pairCodePlaceholder')}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
          />
        </Field>
        <Button variant="outline" size="lg" type="submit" disabled={task.busy || !wireless.pairReady}>
          {t('home.wireless.pair')}
        </Button>
      </form>

      <form
        className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
        onSubmit={event => {
          event.preventDefault();
          wireless.connect();
        }}
      >
        <Field label={t('home.wireless.addressLabel')} htmlFor="wireless-address">
          <Input
            id="wireless-address"
            value={wireless.address}
            onChange={event => wireless.setAddress(event.target.value)}
            placeholder="192.168.1.20:5555"
            inputMode="url"
            leading={<Link2 />}
          />
        </Field>
        <Button variant="primary" size="lg" type="submit" disabled={task.busy || !wireless.connectReady}>
          {t('home.wireless.connect')}
        </Button>
        <Button variant="outline" size="lg" disabled={task.busy || !wireless.connectReady} onClick={wireless.disconnect}>
          {t('common.disconnect')}
        </Button>
      </form>
    </div>
  );
}
