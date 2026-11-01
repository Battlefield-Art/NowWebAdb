import { useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { Cog, LifeBuoy, MoreHorizontal, Power, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PanelShell } from '@/features/connection/PanelShell';
import { powerAction, type PowerAction } from '@/lib/adb/power';
import { useT, type MessageKey } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';

interface PowerItem {
  action: PowerAction;
  labelKey: MessageKey;
  descriptionKey: MessageKey;
  confirmKey: MessageKey;
}

const COMMON_ACTIONS: readonly PowerItem[] = [
  {
    action: 'reboot',
    labelKey: 'connection.power.reboot.label',
    descriptionKey: 'connection.power.reboot.description',
    confirmKey: 'connection.power.reboot.confirm',
  },
  {
    action: 'recovery',
    labelKey: 'connection.power.recovery.label',
    descriptionKey: 'connection.power.recovery.description',
    confirmKey: 'connection.power.recovery.confirm',
  },
  {
    action: 'bootloader',
    labelKey: 'connection.power.bootloader.label',
    descriptionKey: 'connection.power.bootloader.description',
    confirmKey: 'connection.power.bootloader.confirm',
  },
  {
    action: 'power-off',
    labelKey: 'connection.power.powerOff.label',
    descriptionKey: 'connection.power.powerOff.description',
    confirmKey: 'connection.power.powerOff.confirm',
  },
];

const ADVANCED_ACTIONS: readonly PowerItem[] = [
  {
    action: 'fastboot',
    labelKey: 'connection.power.fastboot.label',
    descriptionKey: 'connection.power.fastboot.description',
    confirmKey: 'connection.power.fastboot.confirm',
  },
  {
    action: 'sideload',
    labelKey: 'connection.power.sideload.label',
    descriptionKey: 'connection.power.sideload.description',
    confirmKey: 'connection.power.sideload.confirm',
  },
  {
    action: 'power-button',
    labelKey: 'connection.power.powerButton.label',
    descriptionKey: 'connection.power.powerButton.description',
    confirmKey: 'connection.power.powerButton.confirm',
  },
  {
    action: 'power-button-long',
    labelKey: 'connection.power.powerButtonLong.label',
    descriptionKey: 'connection.power.powerButtonLong.description',
    confirmKey: 'connection.power.powerButtonLong.confirm',
  },
  {
    action: 'edl',
    labelKey: 'connection.power.edl.label',
    descriptionKey: 'connection.power.edl.description',
    confirmKey: 'connection.power.edl.confirm',
  },
  {
    action: 'odin',
    labelKey: 'connection.power.odin.label',
    descriptionKey: 'connection.power.odin.description',
    confirmKey: 'connection.power.odin.confirm',
  },
];

export interface PowerPanelProps {
  adb: Adb;
}

export function PowerPanel({ adb }: PowerPanelProps) {
  const t = useT();
  const [pending, setPending] = useState<PowerItem | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (item: PowerItem) => {
    setPending(null);
    setBusy(true);
    try {
      const message = await powerAction(adb, item.action);
      toast.success(message.trim() || t('connection.power.sent', { action: t(item.confirmKey) }));
    } catch (cause) {
      toast.error(toErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelShell
      kicker="Power"
      title={t('connection.power.title')}
      action={
        <div className="flex items-center gap-2">
          <Badge tone="warning">{t('connection.power.caution')}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t('connection.power.more')} disabled={busy}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('connection.power.advanced')}</DropdownMenuLabel>
              {ADVANCED_ACTIONS.map(item => (
                <DropdownMenuItem key={item.action} onSelect={() => setPending(item)}>
                  {t(item.labelKey)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="text-muted-2">
                {t('connection.power.supportedNote')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {COMMON_ACTIONS.map(item => (
          <Button
            key={item.action}
            variant="outline"
            size="lg"
            className={
              item.action === 'power-off'
                ? 'justify-start text-danger hover:border-danger hover:bg-danger-soft hover:text-danger'
                : 'justify-start'
            }
            disabled={busy}
            onClick={() => setPending(item)}
          >
            {item.action === 'reboot' ? (
              <RotateCcw />
            ) : item.action === 'recovery' ? (
              <LifeBuoy />
            ) : item.action === 'bootloader' ? (
              <Cog />
            ) : (
              <Power />
            )}
            {t(item.labelKey)}
          </Button>
        ))}
      </div>

      <p className="mt-auto border-t border-line-soft pt-3 text-[10.5px] leading-relaxed text-muted-2">
        {t('connection.power.footer')}
      </p>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={open => {
          if (!open) setPending(null);
        }}
        title={t('connection.power.confirmTitle', {
          action: pending ? t(pending.confirmKey) : t('connection.power.execute'),
        })}
        description={pending ? t(pending.descriptionKey) : undefined}
        confirmLabel={pending ? t(pending.confirmKey) : t('common.confirm')}
        onConfirm={() => {
          if (pending) void run(pending);
        }}
      />
    </PanelShell>
  );
}
