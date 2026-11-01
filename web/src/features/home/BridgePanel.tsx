import { useCallback, useState } from 'react';
import type { Adb, AdbServerClient } from '@yume-chan/adb';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BridgeForm } from '@/features/home/BridgeForm';
import { ServerDeviceList } from '@/features/home/ServerDeviceList';
import { ServerFeaturesDialog } from '@/features/home/ServerFeaturesDialog';
import { ServerMaintenance } from '@/features/home/ServerMaintenance';
import { ServerMeta } from '@/features/home/ServerMeta';
import { SpinBar } from '@/features/home/SpinBar';
import { WirelessPanel } from '@/features/home/WirelessPanel';
import type { ConnectionTask } from '@/features/home/useConnectionTask';
import { useBridgeServer } from '@/features/home/useBridgeServer';
import { useT } from '@/lib/i18n';
import type { ServerDevice } from '@/lib/connection/server';

const DEFAULT_BRIDGE_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/adb-bridge`;

export interface BridgePanelProps {
  task: ConnectionTask;
  onConnect: (adb: Adb, release: () => Promise<void>, client: AdbServerClient) => void;
}

export function BridgePanel({ task, onConnect }: BridgePanelProps) {
  const t = useT();
  const [url, setUrl] = useState(DEFAULT_BRIDGE_URL);
  const [token, setToken] = useState('');
  const [featuresDevice, setFeaturesDevice] = useState<ServerDevice | null>(null);
  const server = useBridgeServer({ task, url, token, onConnect });
  const { stopServer } = server;

  const handleServerStopped = useCallback(async () => {
    await stopServer();
    setFeaturesDevice(null);
  }, [stopServer]);

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-bold tracking-[-0.01em] text-ink">{t('home.bridge.title')}</h2>
            <Badge tone="neutral">WebSocket</Badge>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
            {t('home.bridge.lead')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={server.refresh}
          disabled={task.busy}
          aria-label={t('home.bridge.refreshAria')}
        >
          <RefreshCw />
        </Button>
      </div>

      <BridgeForm
        url={url}
        token={token}
        busy={task.busy}
        onUrlChange={setUrl}
        onTokenChange={setToken}
        onRefresh={server.refresh}
      />

      <ServerMeta
        info={server.info}
        infoError={server.infoError}
        trackError={server.trackError}
        autoTrack={server.autoTrack}
        loaded={server.loaded}
        onAutoTrackChange={server.updateAutoTrack}
      />

      <SpinBar task={task} />

      <ServerDeviceList
        devices={server.devices}
        loaded={server.loaded}
        busy={task.busy}
        pendingSerial={server.pendingSerial}
        onOpen={server.open}
        onReconnect={server.reconnect}
        onDisconnect={server.disconnect}
        onShowFeatures={setFeaturesDevice}
      />

      <ServerFeaturesDialog
        key={featuresDevice?.serial ?? 'none'}
        client={server.getClient}
        device={featuresDevice}
        onOpenChange={value => {
          if (!value) setFeaturesDevice(null);
        }}
      />

      <ServerMaintenance
        client={server.getClient}
        task={task}
        disabled={!server.loaded}
        onReconnected={server.load}
        onStopped={handleServerStopped}
      />

      <WirelessPanel task={task} getClient={server.getClient} onChanged={server.load} />
    </div>
  );
}
