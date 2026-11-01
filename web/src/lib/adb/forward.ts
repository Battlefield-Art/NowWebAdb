import { AdbServerClient } from '@yume-chan/adb';
import { t } from '@/lib/i18n';

/** One row of `adb forward --list`: the host binds `local`, the device side is `remote`. */
export interface ForwardRule {
  serial: string;
  local: string;
  remote: string;
}

export interface ForwardOptions {
  signal?: AbortSignal;
}

// adb splits `forward:<local>:<remote>` on colons, so anything outside this allow-list could
// smuggle extra service segments into the request string.
const DEVICE_ADDRESS =
  /^(?:tcp:\d{1,5}|localabstract:[A-Za-z0-9._-]{1,128}|localfilesystem:[A-Za-z0-9._+/=-]{1,256}|jdwp:\d{1,9})$/;
// The host end is loopback-only: adb binds forwarded `tcp:` listeners to 127.0.0.1.
const HOST_ADDRESS = /^tcp:\d{1,5}$/;
// Includes `[` and `]` so IPv6 wireless serials such as `[fe80::1]:5555` stay valid.
const SERIAL = /^[A-Za-z0-9._:+[\]-]{1,128}$/;

function readPort(address: string): number {
  return Number(address.slice(4));
}

/** Accepts `8080` or `tcp:8080`; `0`/`tcp:0` lets the server pick a free port. */
export function normalizeForwardHostAddress(input: string): string {
  const value = input.trim();
  const address = /^\d/.test(value) ? `tcp:${value}` : value;
  if (!HOST_ADDRESS.test(address)) throw new Error(t('connection.forwardService.hostInvalid'));
  if (readPort(address) > 65535) throw new Error(t('connection.forwardService.hostInvalid'));
  return address;
}

/** Accepts `8080`, `tcp:8080`, `localabstract:name`, `localfilesystem:path` or `jdwp:pid`. */
export function normalizeForwardDeviceAddress(input: string): string {
  const value = input.trim();
  const address = /^\d/.test(value) ? `tcp:${value}` : value;
  if (!DEVICE_ADDRESS.test(address)) throw new Error(t('connection.forwardService.deviceInvalid'));
  if (address.startsWith('tcp:') && readPort(address) < 1) {
    throw new Error(t('connection.forwardService.deviceInvalid'));
  }
  return address;
}

export function parseForwardList(text: string): ForwardRule[] {
  const rules: ForwardRule[] = [];
  for (const line of text.split('\n')) {
    const [serial, local, remote] = line.trim().split(/\s+/);
    if (!serial || !local || !remote) continue;
    rules.push({ serial, local, remote });
  }
  return rules;
}

async function hostRequest(
  client: AdbServerClient,
  serial: string,
  command: string,
  signal?: AbortSignal
): Promise<string> {
  if (!SERIAL.test(serial)) throw new Error(t('connection.forwardService.serialInvalid'));
  const stream = await client.createConnection(
    AdbServerClient.formatDeviceService({ serial }, command),
    signal ? { signal } : undefined
  );
  try {
    return await stream.readString();
  } finally {
    await stream.dispose();
  }
}

/** `adb forward --list` for one device. */
export async function listForwardRules(
  client: AdbServerClient,
  serial: string,
  options?: ForwardOptions
): Promise<ForwardRule[]> {
  return parseForwardList(await hostRequest(client, serial, 'list-forward', options?.signal));
}

/**
 * `adb forward <local> <remote>`. Returns the effective host address, which differs from
 * `local` when `tcp:0` asked the server to allocate a port.
 */
export async function addForwardRule(
  client: AdbServerClient,
  serial: string,
  local: string,
  remote: string,
  options?: ForwardOptions
): Promise<string> {
  if (!HOST_ADDRESS.test(local)) throw new Error(t('connection.forwardService.hostInvalid'));
  if (!DEVICE_ADDRESS.test(remote)) throw new Error(t('connection.forwardService.deviceInvalid'));
  const payload = (await hostRequest(client, serial, `forward:${local}:${remote}`, options?.signal)).trim();
  return /^\d+$/.test(payload) ? `tcp:${payload}` : local;
}

/** `adb forward --kill <local>` */
export async function removeForwardRule(
  client: AdbServerClient,
  serial: string,
  local: string,
  options?: ForwardOptions
): Promise<void> {
  if (!HOST_ADDRESS.test(local)) throw new Error(t('connection.forwardService.hostInvalid'));
  await hostRequest(client, serial, `killforward:${local}`, options?.signal);
}

/** `adb forward --kill-all` for one device, including rules created by other programs. */
export async function removeAllForwardRules(
  client: AdbServerClient,
  serial: string,
  options?: ForwardOptions
): Promise<void> {
  await hostRequest(client, serial, 'killforward-all', options?.signal);
}
