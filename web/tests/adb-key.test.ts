import { describe, expect, it } from 'vitest';
import { describeAdbKey, generateAdbKey, parsePrivateKey } from '@/lib/adb/adbKey';

describe('adb key helpers', () => {
  it('generates a PKCS#8 key and an ADB public key line', async () => {
    const key = await generateAdbKey();
    expect(key.privateKey[0]).toBe(0x30);
    expect(key.fingerprint).toMatch(/^[0-9A-F]{2}(?::[0-9A-F]{2}){15}$/);
    expect(key.publicKey).toMatch(/^[A-Za-z0-9+/=]+ NowWebAdb@/);
    expect(key.privatePem).toContain('-----BEGIN PRIVATE KEY-----');

    const payload = key.publicKey.split(' ')[0] ?? '';
    const decoded = Uint8Array.from(atob(payload), char => char.charCodeAt(0));
    const view = new DataView(decoded.buffer);
    const modulusLength = view.getUint32(0);
    const exponentLength = view.getUint32(4 + modulusLength);
    expect(modulusLength).toBe(256);
    expect(exponentLength).toBe(3);
    expect(decoded.length).toBe(8 + modulusLength + exponentLength);
  });

  it('round-trips PEM and DER private keys', async () => {
    const key = await generateAdbKey();
    const parsedPem = parsePrivateKey(new TextEncoder().encode(key.privatePem));
    const fromPem = await describeAdbKey(parsedPem);
    expect(fromPem.fingerprint).toBe(key.fingerprint);
    expect(fromPem.publicKey).toBe(key.publicKey);

    expect(parsePrivateKey(key.privateKey)).toEqual(key.privateKey);
  });

  it('rejects PKCS#1, garbage and invalid keys', async () => {
    const pkcs1 = '-----BEGIN RSA PRIVATE KEY-----\nAAAA\n-----END RSA PRIVATE KEY-----';
    expect(() => parsePrivateKey(new TextEncoder().encode(pkcs1))).toThrow(/PKCS#1/);
    expect(() => parsePrivateKey(new TextEncoder().encode('hello'))).toThrow();
    await expect(describeAdbKey(new Uint8Array(128))).rejects.toThrow();
  });
});
