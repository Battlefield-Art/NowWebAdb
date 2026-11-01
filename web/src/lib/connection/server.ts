import { AdbServerClient } from '@yume-chan/adb';
import { toErrorMessage } from '@/lib/utils/format';
import { validateWirelessAddress } from './bridge';
import { t } from '@/lib/i18n';

export const SERVER_DEVICE_STATES = ['device', 'unauthorized', 'offline'] as const;

export type ServerDevice = AdbServerClient.Device;
export type ServerConnectionState = AdbServerClient.ConnectionState;
export type ServerDeviceWatcher = () => Promise<void>;

export interface ServerInfo {
  version: number;
  features: readonly string[];
}

export interface ServerDeviceFeatures {
  transportId: bigint;
  features: readonly string[];
}

export type MdnsServiceKind = 'pairing' | 'connect' | 'other';

export interface MdnsService {
  name: string;
  service: string;
  address: string;
  kind: MdnsServiceKind;
}

function hasControlCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function validateServerSerial(value: string): string {
  const serial = value.trim();
  if (!serial || serial.length > 128 || hasControlCharacter(serial)) {
    throw new Error(t('home.server.error.invalidSerial'));
  }
  return serial;
}

export function mdnsServiceKind(service: string): MdnsServiceKind {
  if (service.includes('_adb-tls-pairing')) return 'pairing';
  if (service.includes('_adb-tls-connect')) return 'connect';
  return 'other';
}

export function describeServerError(error: unknown): string {
  if (error instanceof AdbServerClient.NetworkError) {
    return t('home.server.error.network', { message: error.message });
  }
  if (error instanceof AdbServerClient.UnauthorizedError) {
    return t('home.server.error.unauthorized');
  }
  if (error instanceof AdbServerClient.AlreadyConnectedError) {
    return t('home.server.error.alreadyConnected');
  }
  return toErrorMessage(error);
}

export async function readServerInfo(client: AdbServerClient): Promise<ServerInfo> {
  const [version, features] = await Promise.all([client.getVersion(), client.getServerFeatures()]);
  return { version, features };
}

export async function listServerDevices(
  client: AdbServerClient,
  states: readonly ServerConnectionState[] = SERVER_DEVICE_STATES,
): Promise<ServerDevice[]> {
  return client.getDevices([...states]);
}

export async function reconnectServerDevice(client: AdbServerClient, serial: string): Promise<void> {
  await client.reconnectDevice({ serial: validateServerSerial(serial) });
}

/** `adb reconnect offline` */
export async function reconnectOfflineDevices(client: AdbServerClient): Promise<void> {
  await client.reconnectDevice('offline');
}

export async function readServerDeviceFeatures(
  client: AdbServerClient,
  serial: string,
): Promise<ServerDeviceFeatures> {
  return client.getDeviceFeatures({ serial: validateServerSerial(serial) });
}

export async function waitForServerDevice(
  client: AdbServerClient,
  serial: string,
  state: 'device' | 'disconnect',
  signal?: AbortSignal,
): Promise<void> {
  await client.waitFor({ serial: validateServerSerial(serial) }, state, signal ? { signal } : {});
}

/** Returns `false` when the transport is not ready before `timeoutMs`. */
export async function waitForWirelessDevice(
  client: AdbServerClient,
  address: string,
  timeoutMs = 10_000,
): Promise<boolean> {
  const serial = validateWirelessAddress(address);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await client.waitFor({ serial }, 'device', { signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function watchServerDevices(
  client: AdbServerClient,
  onChange: (devices: readonly ServerDevice[]) => void,
  onError?: (error: unknown) => void,
  signal?: AbortSignal,
): Promise<ServerDeviceWatcher> {
  const observer = await client.trackDevices({
    includeStates: [...SERVER_DEVICE_STATES],
    ...(signal ? { signal } : {}),
  });
  const remove = [observer.onListChange(devices => onChange([...devices]))];
  if (onError) remove.push(observer.onError(error => onError(error)));
  onChange([...observer.current]);
  return async () => {
    for (const dispose of remove) dispose();
    await observer.stop();
  };
}

export async function killServer(client: AdbServerClient): Promise<void> {
  await client.killServer();
}

export async function isMdnsSupported(client: AdbServerClient): Promise<boolean> {
  try {
    return await client.mDns.check();
  } catch {
    return false;
  }
}

export async function listMdnsServices(client: AdbServerClient): Promise<MdnsService[]> {
  const services = await client.mDns.getServices();
  return services.map(item => ({
    name: item.name,
    service: item.service,
    address: item.address,
    kind: mdnsServiceKind(item.service),
  }));
}

export async function pairWirelessDevice(
  client: AdbServerClient,
  address: string,
  code: string,
): Promise<void> {
  const target = validateWirelessAddress(address);
  if (!/^\d{6}$/.test(code)) throw new Error(t('home.server.error.pairCode'));
  await client.wireless.pair(target, code);
}

export async function connectWirelessDevice(client: AdbServerClient, address: string): Promise<void> {
  await client.wireless.connect(validateWirelessAddress(address));
}

export async function disconnectWirelessDevice(client: AdbServerClient, address: string): Promise<void> {
  await client.wireless.disconnect(validateWirelessAddress(address));
}

/** Wireless transports expose their address as `<host>:<port>` in the device list. */
export function isWirelessSerial(serial: string): boolean {
  return /^(?:\[[0-9a-fA-F:]+\]|[a-zA-Z0-9][a-zA-Z0-9.-]*):\d{1,5}$/.test(serial);
}
