import { useState } from 'react';
import { AdbServerClient } from '@yume-chan/adb';
import { Power, RefreshCw, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { ConnectionTask } from '@/features/home/useConnectionTask';
import { useT } from '@/lib/i18n';
import { killServer, reconnectOfflineDevices } from '@/lib/connection/server';

export interface ServerMaintenanceProps {
  client: () => AdbServerClient;
  task: ConnectionTask;
  disabled: boolean;
  onReconnected: () => Promise<void>;
  onStopped: () => Promise<void>;
}

export function ServerMaintenance({ client, task, disabled, onReconnected, onStopped }: ServerMaintenanceProps) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);

  const reconnect = () => {
    void task.run(t('home.serverMaintenance.reconnecting'), async () => {
      await reconnectOfflineDevices(client());
      await onReconnected();
      toast.success(t('home.serverMaintenance.reconnected'));
    });
  };

  const stop = () => {
    setConfirming(false);
    void task.run(t('home.serverMaintenance.stopping'), async () => {
      try {
        await killServer(client());
      } catch (error) {
        // The server closes the bridge connection while acknowledging `host:kill`.
        if (!(error instanceof AdbServerClient.NetworkError)) throw error;
      }
      await onStopped();
      toast.success(t('home.serverMaintenance.stopped'));
    });
  };

  return (
    <div className="grid gap-3 border-t border-line-soft pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[12.5px] font-bold text-ink">
            <Wrench className="size-3.5 text-accent" />
            {t('home.serverMaintenance.title')}
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            {t('home.serverMaintenance.lead')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="md" disabled={disabled || task.busy} onClick={reconnect}>
            <RefreshCw />
            {t('home.serverMaintenance.reconnect')}
          </Button>
          <Button variant="danger" size="md" disabled={disabled || task.busy} onClick={() => setConfirming(true)}>
            <Power />
            {t('home.serverMaintenance.stop')}
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('home.serverMaintenance.stopTitle')}
        description={t('home.serverMaintenance.stopDescription')}
        confirmLabel={t('home.serverMaintenance.stop')}
        onConfirm={stop}
      />
    </div>
  );
}
