import { Radar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useT, type MessageKey } from '@/lib/i18n';
import type { MdnsService } from '@/lib/connection/server';

const KIND_LABEL = {
  pairing: { labelKey: 'home.mdns.kind.pairing', tone: 'accent' },
  connect: { labelKey: 'home.mdns.kind.connect', tone: 'success' },
  other: { labelKey: 'home.mdns.kind.other', tone: 'neutral' },
} as const satisfies Record<MdnsService['kind'], { labelKey: MessageKey; tone: 'accent' | 'success' | 'neutral' }>;

export interface MdnsServiceListProps {
  services: readonly MdnsService[];
  note: string;
  busy?: boolean;
  onPick: (service: MdnsService) => void;
  onConnect?: (service: MdnsService) => void;
}

export function MdnsServiceList({ services, note, busy, onPick, onConnect }: MdnsServiceListProps) {
  const t = useT();
  if (services.length === 0) {
    return note ? <p className="text-[10.5px] leading-relaxed text-muted-2">{note}</p> : null;
  }
  return (
    <div className="grid gap-1.5">
      {services.map(service => {
        const kind = KIND_LABEL[service.kind];
        return (
          <div
            key={`${service.name}|${service.address}`}
            className="flex items-center justify-between gap-2 rounded-[9px] border border-line-soft bg-surface-2 px-2.5 py-1.5"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Radar className="size-3.5 shrink-0 text-muted-2" />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-ink-soft">
                  {service.name || service.service}
                </p>
                <p className="truncate font-mono text-[10px] text-muted">{service.address}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Badge tone={kind.tone}>{t(kind.labelKey)}</Badge>
              {service.kind === 'connect' && onConnect ? (
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => onConnect(service)}>
                  {t('common.connect')}
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" disabled={busy || service.kind === 'other'} onClick={() => onPick(service)}>
                {t('home.mdns.fill')}
              </Button>
            </div>
          </div>
        );
      })}
      {note ? <p className="text-[10.5px] leading-relaxed text-muted-2">{note}</p> : null}
    </div>
  );
}
