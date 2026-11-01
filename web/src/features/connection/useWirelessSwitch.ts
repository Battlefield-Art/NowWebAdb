import { useCallback, useState } from 'react';
import { AdbServerClient, type Adb } from '@yume-chan/adb';
import { toast } from 'sonner';
import { setTcpIpPort } from '@/lib/adb/tcpip';
import { readWifiAddress } from '@/lib/adb/wifi';
import { closeBridgeClient } from '@/lib/connection/bridge';
import { connectWirelessDevice, isWirelessSerial, waitForWirelessDevice } from '@/lib/connection/server';
import { toErrorMessage } from '@/lib/utils/format';
import { useDeviceStore } from '@/stores/device';
import { t } from '@/lib/i18n';

const SWITCH_TOAST = 'wireless-switch';
const CONNECT_ATTEMPTS = 4;
const CONNECT_INTERVAL = 800;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function connectWithRetry(client: AdbServerClient, address: string): Promise<void> {
  for (let attempt = 1; attempt <= CONNECT_ATTEMPTS; attempt += 1) {
    try {
      await connectWirelessDevice(client, address);
      return;
    } catch (error) {
      if (error instanceof AdbServerClient.AlreadyConnectedError) return;
      if (attempt === CONNECT_ATTEMPTS) throw error;
      await delay(CONNECT_INTERVAL);
    }
  }
}

export interface WirelessSwitch {
  busy: boolean;
  wireless: boolean;
  canSwitch: boolean;
  switchToWireless: (port: number) => void;
}

export function useWirelessSwitch(
  adb: Adb,
  server: AdbServerClient | null,
  knownWlanIp = '',
): WirelessSwitch {
  const kind = useDeviceStore(state => state.kind);
  const connect = useDeviceStore(state => state.connect);
  const holdConnection = useDeviceStore(state => state.holdConnection);
  const [busy, setBusy] = useState(false);
  const wireless = isWirelessSerial(adb.serial);
  const canSwitch = kind === 'server' && server !== null && !wireless && !busy;

  const switchToWireless = useCallback(
    (port: number) => {
      if (!server || busy) return;
      setBusy(true);
      void (async () => {
        let held = false;
        try {
          const ip = knownWlanIp || (await readWifiAddress(adb));
          const address = `${ip}:${port}`;
          toast.loading(t('connection.wireless.switching', { address: address }), { id: SWITCH_TOAST });
          holdConnection();
          held = true;
          await setTcpIpPort(adb, port);
          await connectWithRetry(server, address);
          if (!(await waitForWirelessDevice(server, address))) {
            throw new Error(t('connection.wireless.timeout'));
          }
          const next = await server.createAdb({ serial: address });
          connect({ adb: next, kind: 'server', server, release: () => closeBridgeClient(server) });
          toast.success(t('connection.wireless.switched', { address: address }), { id: SWITCH_TOAST });
        } catch (cause) {
          if (held) void useDeviceStore.getState().disconnect();
          toast.error(t('connection.wireless.failed', { error: toErrorMessage(cause) }), { id: SWITCH_TOAST });
        } finally {
          setBusy(false);
        }
      })();
    },
    [adb, busy, connect, holdConnection, knownWlanIp, server],
  );

  return { busy, wireless, canSwitch, switchToWireless };
}
