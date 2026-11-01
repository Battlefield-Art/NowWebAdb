import { describe, expect, it } from 'vitest';
import { validateApkPath, validatePackageName } from '@/lib/adb/packages';
import { validateBridgeToken, validateBridgeUrl, validateWirelessAddress } from '@/lib/connection/bridge';

describe('validateBridgeUrl', () => {
  it('accepts secure remote bridges', () => {
    expect(validateBridgeUrl('wss://bridge.example.com/adb-bridge', 'https:')).toBe(
      'wss://bridge.example.com/adb-bridge',
    );
  });

  it('allows plain ws only for localhost', () => {
    expect(validateBridgeUrl('ws://127.0.0.1:5858/adb-bridge', 'http:')).toBe('ws://127.0.0.1:5858/adb-bridge');
    expect(() => validateBridgeUrl('ws://example.com/adb-bridge', 'http:')).toThrow('WSS');
  });

  it('rejects insecure or decorated urls', () => {
    expect(() => validateBridgeUrl('http://127.0.0.1:5858', 'http:')).toThrow();
    expect(() => validateBridgeUrl('wss://bridge.example.com/?token=x', 'https:')).toThrow();
    expect(() => validateBridgeUrl('wss://user:pass@bridge.example.com', 'https:')).toThrow();
    expect(() => validateBridgeUrl('ws://127.0.0.1:5858', 'https:')).toThrow('WSS');
  });
});

describe('validateBridgeToken', () => {
  it('accepts base64url tokens of a sane length', () => {
    const token = 'A'.repeat(43);
    expect(validateBridgeToken(token)).toBe(token);
  });

  it('rejects short or malformed tokens', () => {
    expect(() => validateBridgeToken('short')).toThrow();
    expect(() => validateBridgeToken(`${'A'.repeat(43)}+`)).toThrow();
  });
});

describe('validateWirelessAddress', () => {
  it('normalizes host and port', () => {
    expect(validateWirelessAddress(' 192.168.1.20:05555 ')).toBe('192.168.1.20:5555');
    expect(validateWirelessAddress('[::1]:5555')).toBe('[::1]:5555');
  });

  it('rejects out-of-range ports and schemes', () => {
    expect(() => validateWirelessAddress('192.168.1.20:0')).toThrow();
    expect(() => validateWirelessAddress('adb://192.168.1.20:5555')).toThrow();
    expect(() => validateWirelessAddress('192.168.1.20')).toThrow();
  });
});

describe('package and apk validation', () => {
  it('accepts java-style package names', () => {
    expect(validatePackageName('com.example.notes')).toBe('com.example.notes');
    expect(validatePackageName('a_b.c1')).toBe('a_b.c1');
  });

  it('rejects shell metacharacters in package names', () => {
    expect(() => validatePackageName('com.example;rm -rf /')).toThrow();
    expect(() => validatePackageName('com..example')).toThrow();
  });

  it('rejects traversal and control characters in apk paths', () => {
    expect(validateApkPath('/data/app/base.apk')).toBe('/data/app/base.apk');
    expect(() => validateApkPath('/data/../system/app.apk')).toThrow();
    expect(() => validateApkPath('/data/app/base.txt')).toThrow();
    expect(() => validateApkPath('/data/app/base\u0001.apk')).toThrow();
  });
});
