import { useCallback, useEffect, useRef, useState } from 'react';
import type { Adb, AdbServerClient } from '@yume-chan/adb';
import { parseIpAddress } from '@/lib/adb/deviceInfo';
import { listForwardRules, type ForwardRule } from '@/lib/adb/forward';
import { listReverseTunnels, type AdbForwardListener } from '@/lib/adb/reverse';
import { execText } from '@/lib/adb/shell';
import { getTcpIpState, type TcpIpState } from '@/lib/adb/tcpip';
import { toErrorMessage } from '@/lib/utils/format';

export interface ConnectionStatus {
  wlanIp: string;
  tcp: TcpIpState | null;
  reverse: AdbForwardListener[];
  forwards: ForwardRule[];
  tcpError: string;
  reverseError: string;
  forwardsError: string;
}

const EMPTY: ConnectionStatus = {
  wlanIp: '',
  tcp: null,
  reverse: [],
  forwards: [],
  tcpError: '',
  reverseError: '',
  forwardsError: '',
};

export interface ConnectionStatusController {
  status: ConnectionStatus;
  loading: boolean;
  refresh: () => void;
}

/** Host-side forwarding is an ADB Server feature: without the bridge there is no local listener to bind. */
export function useConnectionStatus(
  adb: Adb | null,
  server: AdbServerClient | null,
  serial: string
): ConnectionStatusController {
  const [status, setStatus] = useState<ConnectionStatus>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!adb) return;
    const token = requestRef.current + 1;
    requestRef.current = token;
    void (async () => {
      setLoading(true);
      try {
        const [tcp, reverse, address, forwards] = await Promise.allSettled([
          getTcpIpState(adb),
          listReverseTunnels(adb),
          execText(adb, ['ip', '-o', '-4', 'addr', 'show', 'wlan0'], { timeout: 6000 }),
          server && serial ? listForwardRules(server, serial) : Promise.resolve([]),
        ]);
        if (requestRef.current !== token) return;
        setStatus({
          wlanIp: address.status === 'fulfilled' ? parseIpAddress(address.value) : '',
          tcp: tcp.status === 'fulfilled' ? tcp.value : null,
          reverse: reverse.status === 'fulfilled' ? reverse.value : [],
          forwards: forwards.status === 'fulfilled' ? forwards.value : [],
          tcpError: tcp.status === 'rejected' ? toErrorMessage(tcp.reason) : '',
          reverseError: reverse.status === 'rejected' ? toErrorMessage(reverse.reason) : '',
          forwardsError: forwards.status === 'rejected' ? toErrorMessage(forwards.reason) : '',
        });
      } finally {
        if (requestRef.current === token) setLoading(false);
      }
    })();
    return () => {
      requestRef.current += 1;
    };
  }, [adb, server, serial, attempt]);

  const refresh = useCallback(() => setAttempt(value => value + 1), []);

  return { status, loading, refresh };
}
