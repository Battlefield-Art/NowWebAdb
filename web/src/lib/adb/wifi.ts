import type { Adb } from '@yume-chan/adb';
import { exec } from './shell';
import { t } from '@/lib/i18n';

const WIFI_COMMAND = [
  'ip route get 1.1.1.1 2>/dev/null',
  'ip -f inet addr show wlan0 2>/dev/null',
  'ip addr show wlan0 2>/dev/null',
  'ifconfig wlan0 2>/dev/null',
].join('; ');

const LOOPBACK = /^127\./;
const LINK_LOCAL = /^169\.254\./;

export function parseWifiAddress(output: string): string {
  const routeSrc = /\bsrc\s+(\d{1,3}(?:\.\d{1,3}){3})/.exec(output)?.[1];
  if (routeSrc && !LOOPBACK.test(routeSrc) && !LINK_LOCAL.test(routeSrc)) return routeSrc;
  for (const match of output.matchAll(/\binet\s+(?:addr:)?(\d{1,3}(?:\.\d{1,3}){3})/g)) {
    const address = match[1];
    if (address && !LOOPBACK.test(address) && !LINK_LOCAL.test(address)) return address;
  }
  throw new Error(t('connection.wifi.noAddress'));
}

export async function readWifiAddress(adb: Adb, signal?: AbortSignal): Promise<string> {
  const result = await exec(adb, WIFI_COMMAND, { timeout: 6000, ...(signal ? { signal } : {}) });
  return parseWifiAddress(`${result.stdout}\n${result.stderr}`);
}
