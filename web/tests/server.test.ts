import { AdbServerClient } from '@yume-chan/adb';
import { describe, expect, it } from 'vitest';
import {
  describeServerError,
  isWirelessSerial,
  mdnsServiceKind,
  validateServerSerial,
} from '@/lib/connection/server';

describe('ADB Server device selectors', () => {
  it('accepts USB and wireless serials', () => {
    expect(validateServerSerial(' emulator-5554 ')).toBe('emulator-5554');
    expect(validateServerSerial('192.168.1.20:5555')).toBe('192.168.1.20:5555');
  });

  it('rejects empty, oversized and control characters', () => {
    expect(() => validateServerSerial('')).toThrow();
    expect(() => validateServerSerial('a'.repeat(129))).toThrow();
    expect(() => validateServerSerial('bad\nserial')).toThrow();
  });

  it('recognizes wireless transports', () => {
    expect(isWirelessSerial('192.168.1.20:5555')).toBe(true);
    expect(isWirelessSerial('[fe80::1]:5555')).toBe(true);
    expect(isWirelessSerial('emulator-5554')).toBe(false);
    expect(isWirelessSerial('192.168.1.20')).toBe(false);
  });
});

describe('mDNS service classification', () => {
  it('maps pairing and connect advertisement types', () => {
    expect(mdnsServiceKind('_adb-tls-pairing._tcp.')).toBe('pairing');
    expect(mdnsServiceKind('_adb-tls-connect._tcp.')).toBe('connect');
    expect(mdnsServiceKind('_http._tcp.')).toBe('other');
  });
});

describe('ADB Server error messages', () => {
  it('explains bridge protocol errors without exposing raw payloads', () => {
    expect(describeServerError(new AdbServerClient.NetworkError('boom'))).toContain('网络错误');
    expect(describeServerError(new AdbServerClient.UnauthorizedError('bad token'))).toContain('令牌');
    expect(describeServerError(new AdbServerClient.AlreadyConnectedError('dup'))).toContain('已经连接');
    expect(describeServerError(new Error('自定义错误'))).toBe('自定义错误');
    expect(describeServerError('字符串错误')).toBe('字符串错误');
  });
});
