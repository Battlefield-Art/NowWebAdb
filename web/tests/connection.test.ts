import { describe, expect, it } from 'vitest';
import {
  normalizeDeviceAddress,
  normalizeHostAddress,
  parseTcpPort,
  tcpListenSummary,
  tcpPortOf,
} from '@/features/connection/connectionUtils';
import { parseWifiAddress } from '@/lib/adb/wifi';

describe('connection address normalization', () => {
  it('accepts bare ports and tcp targets', () => {
    expect(normalizeDeviceAddress('8080')).toBe('tcp:8080');
    expect(normalizeDeviceAddress(' tcp:5555 ')).toBe('tcp:5555');
    expect(normalizeHostAddress('5038')).toBe('tcp:5038');
    expect(normalizeHostAddress('tcp:5038')).toBe('tcp:5038');
  });

  it('accepts localabstract device names', () => {
    expect(normalizeDeviceAddress('localabstract:scrcpy')).toBe('localabstract:scrcpy');
  });

  it('rejects empty, out-of-range and malformed targets', () => {
    expect(() => normalizeDeviceAddress('')).toThrow();
    expect(() => normalizeDeviceAddress('0')).toThrow();
    expect(() => normalizeDeviceAddress('70000')).toThrow();
    expect(() => normalizeDeviceAddress('localabstract:bad name')).toThrow();
    expect(() => normalizeHostAddress('udp:5000')).toThrow();
    expect(() => parseTcpPort('abc')).toThrow();
  });
});

describe('tcp state formatting', () => {
  it('summarizes listening addresses', () => {
    expect(tcpListenSummary(null)).toBe('未读取');
    expect(tcpListenSummary({ serviceListenAddresses: [], servicePort: undefined, persistPort: undefined })).toBe(
      '未启用',
    );
    expect(
      tcpListenSummary({ serviceListenAddresses: ['tcp:5555'], servicePort: 5555, persistPort: undefined }),
    ).toBe('tcp:5555');
  });

  it('derives the current port from state', () => {
    expect(tcpPortOf(null)).toBe('');
    expect(
      tcpPortOf({ serviceListenAddresses: ['tcp:5555'], servicePort: 5555, persistPort: undefined }),
    ).toBe('5555');
    expect(
      tcpPortOf({ serviceListenAddresses: ['tcp:4444'], servicePort: undefined, persistPort: undefined }),
    ).toBe('4444');
  });
});

describe('wifi address parsing', () => {
  it('prefers the route source address', () => {
    const output = '1.1.1.1 via 192.168.1.1 dev wlan0 src 192.168.1.23 uid 2000\ninet 10.0.0.9/24 brd 10.0.0.255 scope global wlan0';
    expect(parseWifiAddress(output)).toBe('192.168.1.23');
  });

  it('falls back to wlan0 inet output including ifconfig', () => {
    expect(parseWifiAddress('2: wlan0: <BROADCAST>\n    inet 192.168.0.42/24 brd 192.168.0.255 scope global wlan0')).toBe(
      '192.168.0.42',
    );
    expect(parseWifiAddress('wlan0: flags=4163\n        inet addr:10.1.2.3  Bcast:10.1.2.255  Mask:255.255.255.0')).toBe(
      '10.1.2.3',
    );
  });

  it('ignores loopback and link-local addresses', () => {
    expect(parseWifiAddress('1.1.1.1 via 127.0.0.1 dev lo src 127.0.0.1\ninet 10.0.0.5/24 scope global wlan0')).toBe(
      '10.0.0.5',
    );
    expect(() => parseWifiAddress('inet 127.0.0.1/8 scope host lo')).toThrow();
    expect(() => parseWifiAddress('inet 169.254.3.4/16 scope link wlan0')).toThrow();
    expect(() => parseWifiAddress('')).toThrow();
  });
});
