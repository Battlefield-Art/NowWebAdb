import type { TcpIpState } from '@/lib/adb/tcpip';
import { t } from '@/lib/i18n';

export const DEFAULT_TCP_PORT = '5555';

function parsePort(value: string, label: string): number {
  if (!/^\d{1,5}$/.test(value)) {
    throw new Error(t('connection.utils.portRange', { label }));
  }
  const port = Number(value);
  if (port < 1 || port > 65535) throw new Error(t('connection.utils.portRange', { label }));
  return port;
}

export function parseTcpPort(value: string): number {
  return parsePort(value.trim(), t('connection.utils.labelPort'));
}

export function normalizeDeviceAddress(input: string): string {
  const value = input.trim();
  if (!value) throw new Error(t('connection.utils.deviceAddressRequired'));
  if (/^\d{1,5}$/.test(value) || /^tcp:\d{1,5}$/.test(value)) {
    return `tcp:${parsePort(value.replace(/^tcp:/, ''), t('connection.utils.labelDevicePort'))}`;
  }
  if (/^localabstract:[A-Za-z0-9._-]{1,64}$/.test(value)) return value;
  throw new Error(t('connection.utils.deviceAddressInvalid'));
}

export function normalizeHostAddress(input: string): string {
  const value = input.trim();
  if (!value) throw new Error(t('connection.utils.hostPortRequired'));
  if (/^\d{1,5}$/.test(value)) return `tcp:${parsePort(value, t('connection.utils.labelHostPort'))}`;
  if (/^tcp:\d{1,5}$/.test(value)) {
    return `tcp:${parsePort(value.slice(4), t('connection.utils.labelHostPort'))}`;
  }
  throw new Error(t('connection.utils.hostPortInvalid'));
}

export function tcpListenSummary(state: TcpIpState | null): string {
  if (!state) return t('connection.utils.notRead');
  return state.serviceListenAddresses.length > 0
    ? state.serviceListenAddresses.join(', ')
    : t('connection.utils.notEnabled');
}

export function tcpPortOf(state: TcpIpState | null): string {
  if (!state) return '';
  if (state.servicePort !== undefined) return String(state.servicePort);
  const address = state.serviceListenAddresses[0] ?? '';
  return address.startsWith('tcp:') ? address.slice(4) : '';
}
