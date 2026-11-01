import { useCallback, useEffect, useRef, useState } from 'react';
import { AdbServerClient, type Adb } from '@yume-chan/adb';
import type { ConnectionTask } from '@/features/home/useConnectionTask';
import { closeBridgeClient, createBridgeClient } from '@/lib/connection/bridge';
import { useT } from '@/lib/i18n';
import {
  describeServerError,
  disconnectWirelessDevice,
  listServerDevices,
  readServerInfo,
  reconnectServerDevice,
  watchServerDevices,
  type ServerDevice,
  type ServerDeviceWatcher,
  type ServerInfo,
} from '@/lib/connection/server';

export interface UseBridgeServerOptions {
  task: ConnectionTask;
  url: string;
  token: string;
  onConnect: (adb: Adb, release: () => Promise<void>, client: AdbServerClient) => void;
}

export function useBridgeServer({ task, url, token, onConnect }: UseBridgeServerOptions) {
  const t = useT();
  const [devices, setDevices] = useState<ServerDevice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [infoError, setInfoError] = useState('');
  const [trackError, setTrackError] = useState('');
  const [autoTrack, setAutoTrack] = useState(true);
  const [pendingSerial, setPendingSerial] = useState('');
  const clientRef = useRef<{ client: AdbServerClient; key: string } | null>(null);
  const watchRef = useRef<ServerDeviceWatcher | null>(null);
  const autoTrackRef = useRef(autoTrack);

  useEffect(() => {
    autoTrackRef.current = autoTrack;
  }, [autoTrack]);

  const stopWatch = useCallback(async () => {
    const watcher = watchRef.current;
    watchRef.current = null;
    if (!watcher) return;
    try {
      await watcher();
    } catch {
      /* The transport may already be closed. */
    }
  }, []);

  const startWatch = useCallback(
    async (client: AdbServerClient) => {
      await stopWatch();
      try {
        watchRef.current = await watchServerDevices(
          client,
          next => setDevices([...next]),
          error => setTrackError(describeServerError(error)),
        );
        setTrackError('');
      } catch (cause) {
        setTrackError(describeServerError(cause));
      }
    },
    [stopWatch],
  );

  useEffect(
    () => () => {
      void stopWatch();
    },
    [stopWatch],
  );

  const getClient = useCallback((): AdbServerClient => {
    const key = `${url}|${token}`;
    if (clientRef.current?.key !== key) {
      if (clientRef.current) {
        void stopWatch();
        closeBridgeClient(clientRef.current.client);
      }
      clientRef.current = { client: createBridgeClient(url, token), key };
    }
    return clientRef.current.client;
  }, [stopWatch, token, url]);

  const load = useCallback(async (): Promise<void> => {
    const client = getClient();
    const [devicesResult, infoResult] = await Promise.allSettled([
      listServerDevices(client),
      readServerInfo(client),
    ]);
    if (devicesResult.status === 'rejected') throw devicesResult.reason;
    setDevices(devicesResult.value);
    setInfo(infoResult.status === 'fulfilled' ? infoResult.value : null);
    setInfoError(infoResult.status === 'rejected' ? describeServerError(infoResult.reason) : '');
    setLoaded(true);
    if (autoTrackRef.current) await startWatch(client);
  }, [getClient, startWatch]);

  const refresh = useCallback(() => {
    void task.run(t('home.bridge.status.reading'), load);
  }, [load, t, task]);

  const open = useCallback(
    (device: ServerDevice) => {
      void task.run(t('home.bridge.status.opening'), async () => {
        const client = getClient();
        await stopWatch();
        const adb = await client.createAdb({ transportId: device.transportId });
        onConnect(
          adb,
          async () => {
            await stopWatch();
            closeBridgeClient(client);
          },
          client,
        );
      });
    },
    [getClient, onConnect, stopWatch, t, task],
  );

  const withPending = useCallback((serial: string, running: () => Promise<void>) => {
    setPendingSerial(serial);
    void running().finally(() => setPendingSerial(''));
  }, []);

  const reconnect = useCallback(
    (device: ServerDevice) => {
      withPending(device.serial, () =>
        task.run(t('home.bridge.status.reconnecting', { serial: device.serial }), async () => {
          await reconnectServerDevice(getClient(), device.serial);
          await load();
        }),
      );
    },
    [getClient, load, t, task, withPending],
  );

  const disconnect = useCallback(
    (device: ServerDevice) => {
      withPending(device.serial, () =>
        task.run(t('home.bridge.status.disconnecting', { serial: device.serial }), async () => {
          await disconnectWirelessDevice(getClient(), device.serial);
          await load();
        }),
      );
    },
    [getClient, load, t, task, withPending],
  );

  const updateAutoTrack = useCallback(
    (next: boolean) => {
      setAutoTrack(next);
      if (!next) {
        void stopWatch();
        setTrackError('');
        return;
      }
      if (loaded) void startWatch(getClient());
    },
    [getClient, loaded, startWatch, stopWatch],
  );

  const stopServer = useCallback(async () => {
    await stopWatch();
    if (clientRef.current) {
      closeBridgeClient(clientRef.current.client);
      clientRef.current = null;
    }
    setDevices([]);
    setInfo(null);
    setInfoError('');
    setTrackError('');
    setLoaded(false);
  }, [stopWatch]);

  return {
    devices,
    info,
    infoError,
    trackError,
    loaded,
    autoTrack,
    pendingSerial,
    getClient,
    load,
    refresh,
    open,
    reconnect,
    disconnect,
    updateAutoTrack,
    stopServer,
  };
}
