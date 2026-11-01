import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Adb, AdbServerClient } from '@yume-chan/adb';
import { ArrowRight, Cable, Lock, Usb as UsbIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Brand } from '@/components/layout/Brand';
import { LocaleMenu } from '@/components/layout/LocaleMenu';
import { ThemeMenu } from '@/components/layout/ThemeMenu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BridgePanel } from '@/features/home/BridgePanel';
import { IntroPanel } from '@/features/home/IntroPanel';
import { UsbPanel } from '@/features/home/UsbPanel';
import { useConnectionTask } from '@/features/home/useConnectionTask';
import { throwIfAborted } from '@/lib/adb/async';
import { deviceCredentialManager } from '@/lib/connection/credentials';
import { useT } from '@/lib/i18n';
import {
  listUsbDevices,
  openUsbDevice,
  requestUsbDevice,
  watchUsbDevices,
  type AdbDaemonWebUsbDevice,
} from '@/lib/connection/usb';
import { useDeviceStore } from '@/stores/device';

/**
 * WebUSB interfaces are exclusive: release this page's previous connection
 * before opening a device again, otherwise the old session is the "another
 * program" holding it. Returns true when the same device is already connected.
 */
async function releaseExistingConnection(serial: string): Promise<boolean> {
  const current = useDeviceStore.getState();
  if (!current.adb) return false;
  if (current.status === 'connected' && current.serial.toLowerCase() === serial.toLowerCase()) return true;
  await current.disconnect().catch(() => undefined);
  return false;
}

function HomeHeader({ connectedSerial, onWorkspace }: { connectedSerial: string; onWorkspace: () => void }) {
  const t = useT();
  return (
    <header className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5">
      <Brand />
      <div className="flex items-center gap-3">
        <Badge tone={window.isSecureContext ? 'success' : 'warning'}>
          {window.isSecureContext ? t('common.security.secure') : t('home.page.insecure')}
        </Badge>
        <div className="flex items-center gap-0.5">
          <ThemeMenu />
          <LocaleMenu />
        </div>
        {connectedSerial ? (
          <Button variant="primary" size="lg" onClick={onWorkspace}>
            {t('home.page.workspace')}
            <ArrowRight />
          </Button>
        ) : null}
      </div>
    </header>
  );
}

export default function HomePage() {
  const t = useT();
  const navigate = useNavigate();
  const connectDeviceStore = useDeviceStore(state => state.connect);
  const connectedSerial = useDeviceStore(state => (state.status === 'connected' ? state.serial : ''));
  const [mode, setMode] = useState<'usb' | 'bridge'>('usb');
  const [usbDevices, setUsbDevices] = useState<AdbDaemonWebUsbDevice[]>([]);
  const [autoConnect, setAutoConnect] = useState(() => localStorage.getItem('adb_auto_connect') === 'true');
  const task = useConnectionTask();
  const autoAttempted = useRef(false);

  const refreshUsb = useCallback(async () => {
    setUsbDevices(await listUsbDevices());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const update = async () => {
      try {
        const devices = await listUsbDevices();
        if (!cancelled) setUsbDevices(devices);
      } catch {
        /* The browser may deny WebUSB until the first user gesture. */
      }
    };
    void update();
    const unwatch = watchUsbDevices(() => void update());
    return () => {
      cancelled = true;
      unwatch();
    };
  }, []);

  const connectUsbDevice = useCallback(
    async (device: AdbDaemonWebUsbDevice, signal: AbortSignal) => {
      throwIfAborted(signal);
      if (await releaseExistingConnection(device.serial)) {
        navigate('/overview');
        return;
      }
      throwIfAborted(signal);
      const adb = await openUsbDevice(device, deviceCredentialManager.getCredentialStore(), signal);
      if (signal.aborted) {
        await adb.close();
        throwIfAborted(signal);
      }
      try {
        deviceCredentialManager.saveDeviceInfo(device);
      } catch {
        toast.warning(t('home.page.toast.saveFailed'));
      }
      connectDeviceStore({ adb, kind: 'usb' });
      navigate('/overview');
    },
    [connectDeviceStore, navigate, t],
  );

  const connectUsb = useCallback(
    (device: AdbDaemonWebUsbDevice) => {
      void task.run(t('home.page.status.connecting'), signal => connectUsbDevice(device, signal));
    },
    [connectUsbDevice, t, task],
  );

  useEffect(() => {
    if (!autoConnect || autoAttempted.current || usbDevices.length !== 1) return;
    const device = usbDevices[0];
    if (!device) return;
    let cancelled = false;
    void deviceCredentialManager
      .hasStoredKeys()
      .catch(() => false)
      .then(hasKeys => {
        if (cancelled || !hasKeys || autoAttempted.current) return;
        autoAttempted.current = true;
        connectUsb(device);
      });
    return () => {
      cancelled = true;
    };
  }, [autoConnect, connectUsb, usbDevices]);

  const pickUsb = () => {
    void task.run(t('home.page.status.pickUsb'), async signal => {
      const device = await requestUsbDevice();
      if (!device) return;
      await connectUsbDevice(device, signal);
    });
  };

  const openServerDevice = (adb: Adb, release: () => Promise<void>, client: AdbServerClient) => {
    connectDeviceStore({ adb, kind: 'server', release, server: client });
    navigate('/overview');
  };

  const updateAutoConnect = (value: boolean) => {
    setAutoConnect(value);
    localStorage.setItem('adb_auto_connect', String(value));
  };

  return (
    <div className="min-h-screen">
      <HomeHeader connectedSerial={connectedSerial} onWorkspace={() => navigate('/overview')} />

      <main className="mx-auto grid max-w-[1240px] gap-10 px-5 pb-14 pt-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-14 lg:pt-10">
        <IntroPanel />

        <section className="rounded-[16px] border border-line bg-surface p-5 shadow-card sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink">{t('home.page.connectTitle')}</h2>
              <p className="mt-1 text-[11.5px] text-muted">{t('home.page.connectSubtitle')}</p>
            </div>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-2">
              step 01
            </span>
          </div>

          <Tabs value={mode} onValueChange={value => setMode(value as 'usb' | 'bridge')} className="mt-4">
            <TabsList className="border-b border-line-soft pb-3">
              <TabsTrigger value="usb">
                <UsbIcon className="mr-1.5 size-3.5" />
                {t('home.page.tabUsb')}
              </TabsTrigger>
              <TabsTrigger value="bridge">
                <Cable className="mr-1.5 size-3.5" />
                {t('home.page.tabBridge')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="usb" className="mt-4">
              <UsbPanel
                devices={usbDevices}
                task={task}
                autoConnect={autoConnect}
                onAutoConnectChange={updateAutoConnect}
                onRefresh={refreshUsb}
                onPick={pickUsb}
                onConnect={connectUsb}
                onSwitchToBridge={() => setMode('bridge')}
              />
            </TabsContent>
            <TabsContent value="bridge" className="mt-4">
              <BridgePanel task={task} onConnect={openServerDevice} />
            </TabsContent>
          </Tabs>

          <footer className="mt-5 flex items-start gap-2 border-t border-line-soft pt-3 text-[10.5px] leading-relaxed text-muted">
            <Lock className="mt-0.5 size-3 shrink-0 text-muted-2" />
            {t('home.page.footer')}
          </footer>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-5 text-[10.5px] text-muted-2">
        <span>{t('home.page.footerVersion')}</span>
        <span className="font-mono">WebUSB · ADB over WebSocket</span>
      </footer>
    </div>
  );
}
