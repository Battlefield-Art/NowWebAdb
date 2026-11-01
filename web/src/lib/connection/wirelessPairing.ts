import type { MdnsService, MdnsServiceKind } from './server';
import { t } from '@/lib/i18n';

const SERVICE_ORDER: Record<MdnsServiceKind, number> = { pairing: 0, connect: 1, other: 2 };

/** Returns the host part of `<host>:<port>`; IPv6 hosts keep their brackets. */
export function hostOfAddress(address: string): string | undefined {
  const match = address.trim().match(/^(\[[0-9a-fA-F:]+\]|[^:\s]+):\d{1,5}$/);
  return match?.[1]?.toLowerCase();
}

/**
 * Android advertises the pairing port and the connection port separately.
 * After pairing, the connection service for the same host can be used directly.
 */
export function findConnectService(
  services: readonly MdnsService[],
  pairingAddress: string,
): MdnsService | undefined {
  const host = hostOfAddress(pairingAddress);
  if (!host) return undefined;
  return services.find(service => service.kind === 'connect' && hostOfAddress(service.address) === host);
}

export function sortMdnsServices(services: readonly MdnsService[]): MdnsService[] {
  return [...services].sort(
    (a, b) =>
      SERVICE_ORDER[a.kind] - SERVICE_ORDER[b.kind] ||
      a.name.localeCompare(b.name) ||
      a.address.localeCompare(b.address),
  );
}

export function describePairingError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/wrong password|incorrect|invalid.*(?:code|password)|denied/i.test(message)) {
    return t('home.wireless.error.code');
  }
  if (/failed to connect|refused|unreachable|timed? ?out/i.test(message)) {
    return t('home.wireless.error.unreachable');
  }
  if (/unknown host service|unsupported|not supported/i.test(message)) {
    return t('home.wireless.error.unsupported');
  }
  return message.trim() || t('home.wireless.error.failed');
}
