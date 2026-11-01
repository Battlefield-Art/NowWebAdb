import { useCallback, useState } from 'react';
import { AdbServerClient } from '@yume-chan/adb';
import { toast } from 'sonner';
import type { ConnectionTask } from './useConnectionTask';
import { isWirelessAddress } from '@/lib/connection/bridge';
import {
  connectWirelessDevice,
  disconnectWirelessDevice,
  isMdnsSupported,
  listMdnsServices,
  pairWirelessDevice,
  waitForWirelessDevice,
  type MdnsService,
} from '@/lib/connection/server';
import { describePairingError, findConnectService, sortMdnsServices } from '@/lib/connection/wirelessPairing';
import { useT } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';

export interface WirelessPairingController {
  pairAddress: string;
  pairCode: string;
  address: string;
  services: MdnsService[];
  note: string;
  pairReady: boolean;
  connectReady: boolean;
  setPairAddress: (value: string) => void;
  setPairCode: (value: string) => void;
  setAddress: (value: string) => void;
  discover: () => void;
  pair: () => void;
  connect: (target?: string) => void;
  disconnect: () => void;
  pick: (service: MdnsService) => void;
}

export function useWirelessPairing(
  task: ConnectionTask,
  getClient: () => AdbServerClient,
  onChanged: () => Promise<void>,
): WirelessPairingController {
  const t = useT();
  const [pairAddress, setPairAddress] = useState('');
  const [pairCode, setPairCode] = useState('');
  const [address, setAddress] = useState('');
  const [services, setServices] = useState<MdnsService[]>([]);
  const [note, setNote] = useState('');

  const scan = useCallback(async (): Promise<MdnsService[]> => {
    const client = getClient();
    if (!(await isMdnsSupported(client))) {
      setNote(t('home.wireless.note.mdnsUnsupported'));
      return [];
    }
    const found = sortMdnsServices(await listMdnsServices(client));
    setServices(found);
    setNote(found.length ? '' : t('home.wireless.note.notFound'));
    return found;
  }, [getClient, t]);

  const connectTo = useCallback(
    async (target: string): Promise<boolean> => {
      const client = getClient();
      try {
        await connectWirelessDevice(client, target);
      } catch (error) {
        if (!(error instanceof AdbServerClient.AlreadyConnectedError)) throw error;
      }
      return waitForWirelessDevice(client, target, 10_000);
    },
    [getClient],
  );

  const connect = useCallback(
    (target?: string) => {
      const next = (target ?? address).trim();
      if (!next) return;
      if (target) setAddress(next);
      void task.run(t('home.wireless.status.connecting'), async () => {
        const ready = await connectTo(next);
        await onChanged();
        if (ready) toast.success(t('home.wireless.toast.connected', { address: next }));
        else toast.warning(t('home.wireless.toast.notReady', { address: next }));
      });
    },
    [address, connectTo, onChanged, t, task],
  );

  const pair = useCallback(() => {
    const target = pairAddress.trim();
    void task.run(t('home.wireless.status.pairing'), async () => {
      try {
        await pairWirelessDevice(getClient(), target, pairCode);
      } catch (cause) {
        throw new Error(describePairingError(cause));
      }
      setPairCode('');
      let found: MdnsService[] = [];
      try {
        found = await scan();
      } catch {
        setNote(t('home.wireless.note.mdnsFailed'));
      }
      const match = findConnectService(found, target);
      if (!match) {
        setNote(t('home.wireless.note.noConnectService'));
        toast.success(t('home.wireless.toast.paired'));
        return;
      }
      setAddress(match.address);
      try {
        const ready = await connectTo(match.address);
        await onChanged();
        if (ready) {
          setNote('');
          toast.success(t('home.wireless.toast.pairedConnected', { address: match.address }));
        } else {
          setNote(t('home.wireless.note.pairedStarting', { address: match.address }));
          toast.warning(t('home.wireless.toast.pairedNotReady'));
        }
      } catch (cause) {
        setNote(t('home.wireless.note.pairedConnectFailed', { error: toErrorMessage(cause) }));
        toast.warning(t('home.wireless.toast.pairedConnectFailed'));
      }
    });
  }, [connectTo, getClient, onChanged, pairAddress, pairCode, scan, t, task]);

  const discover = useCallback(() => {
    void task.run(t('home.wireless.status.discovering'), async () => {
      await scan();
    });
  }, [scan, t, task]);

  const disconnect = useCallback(() => {
    const target = address.trim();
    if (!target) return;
    void task.run(t('home.wireless.status.disconnecting'), async () => {
      await disconnectWirelessDevice(getClient(), target);
      toast.success(t('home.wireless.toast.disconnected', { address: target }));
      await onChanged();
    });
  }, [address, getClient, onChanged, t, task]);

  const pick = useCallback((service: MdnsService) => {
    if (service.kind === 'pairing') {
      setPairAddress(service.address);
      setNote(t('home.wireless.note.pairAddressFilled'));
    } else if (service.kind === 'connect') {
      setAddress(service.address);
      setNote(t('home.wireless.note.connectAddressFilled'));
    }
  }, [t]);

  return {
    pairAddress,
    pairCode,
    address,
    services,
    note,
    pairReady: isWirelessAddress(pairAddress) && /^\d{6}$/.test(pairCode),
    connectReady: isWirelessAddress(address),
    setPairAddress,
    setPairCode,
    setAddress,
    discover,
    pair,
    connect,
    disconnect,
    pick,
  };
}
