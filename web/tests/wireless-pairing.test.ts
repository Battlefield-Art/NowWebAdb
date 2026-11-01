import { describe, expect, it } from 'vitest';
import { isWirelessAddress } from '@/lib/connection/bridge';
import type { MdnsService } from '@/lib/connection/server';
import {
  describePairingError,
  findConnectService,
  hostOfAddress,
  sortMdnsServices,
} from '@/lib/connection/wirelessPairing';

const service = (kind: MdnsService['kind'], address: string, name: string = kind): MdnsService => ({
  name,
  service: `_adb-tls-${kind}._tcp.`,
  address,
  kind,
});

describe('wireless pairing helpers', () => {
  it('extracts hosts from IPv4, hostname and IPv6 addresses', () => {
    expect(hostOfAddress('192.168.1.20:37123')).toBe('192.168.1.20');
    expect(hostOfAddress(' Pixel-8.local:5555 ')).toBe('pixel-8.local');
    expect(hostOfAddress('[fe80::1]:5555')).toBe('[fe80::1]');
    expect(hostOfAddress('192.168.1.20')).toBeUndefined();
    expect(hostOfAddress('')).toBeUndefined();
  });

  it('matches the connect service advertised by the same device', () => {
    const services = [
      service('pairing', '192.168.1.20:37123'),
      service('connect', '192.168.1.99:41000'),
      service('connect', '192.168.1.20:37891'),
      service('other', '192.168.1.20:8080'),
    ];
    expect(findConnectService(services, '192.168.1.20:37123')?.address).toBe('192.168.1.20:37891');
    expect(findConnectService(services, '192.168.1.50:37123')).toBeUndefined();
    expect(findConnectService(services, 'invalid')).toBeUndefined();
    expect(findConnectService([service('pairing', '192.168.1.20:1')], '192.168.1.20:1')).toBeUndefined();
  });

  it('orders pairing services before connect services', () => {
    const sorted = sortMdnsServices([
      service('other', 'c:1', 'z'),
      service('connect', 'b:2', 'adb-2'),
      service('connect', 'a:1', 'adb-1'),
      service('pairing', 'p:3', 'adb-p'),
    ]);
    expect(sorted.map(item => `${item.kind}:${item.name}`)).toEqual([
      'pairing:adb-p',
      'connect:adb-1',
      'connect:adb-2',
      'other:z',
    ]);
  });

  it('explains common pairing failures', () => {
    expect(describePairingError(new Error('Failed: Wrong password or connection was dropped.'))).toContain('配对码');
    expect(describePairingError(new Error('failed to connect to 192.168.1.20:37123'))).toContain('局域网');
    expect(describePairingError(new Error('unknown host service'))).toContain('platform-tools');
    expect(describePairingError(new Error('device busy'))).toBe('device busy');
    expect(describePairingError('')).toContain('配对失败');
  });

  it('recognizes valid wireless addresses', () => {
    expect(isWirelessAddress('192.168.1.20:5555')).toBe(true);
    expect(isWirelessAddress('[fe80::1]:5555')).toBe(true);
    expect(isWirelessAddress('pixel.local:5555')).toBe(true);
    expect(isWirelessAddress('192.168.1.20')).toBe(false);
    expect(isWirelessAddress('192.168.1.20:0')).toBe(false);
    expect(isWirelessAddress('')).toBe(false);
  });
});
