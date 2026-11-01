import type { Adb } from '@yume-chan/adb';
import { t } from '@/lib/i18n';

export interface TcpIpState {
  serviceListenAddresses: string[];
  servicePort: number | undefined;
  persistPort: number | undefined;
}

export async function getTcpIpState(adb: Adb): Promise<TcpIpState> {
  return adb.tcpip.getListenAddresses();
}

export async function setTcpIpPort(adb: Adb, port: number): Promise<string> {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(t('connection.tcpipService.invalidPort'));
  return adb.tcpip.setPort(port);
}

export async function disableTcpIp(adb: Adb): Promise<string> {
  return adb.tcpip.disable();
}
