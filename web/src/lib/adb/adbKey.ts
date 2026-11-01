import { t } from '@/lib/i18n';

const RSA_PARAMETERS = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-1' } as const;
const RSA_KEY_PARAMETERS = {
  ...RSA_PARAMETERS,
  modulusLength: 2048,
  publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
};

export interface AdbKeyDetails {
  privateKey: Uint8Array;
  privatePem: string;
  publicPem: string;
  /** ADB `adbkey.pub` line: base64 struct plus a `user@host` comment. */
  publicKey: string;
  fingerprint: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function pemBlock(label: string, der: Uint8Array): string {
  const body = toBase64(der).replace(/(.{64})/g, '$1\n').trim();
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`;
}

function base64UrlBytes(value: string | undefined): Uint8Array {
  if (!value) throw new Error(t('connection.adbKey.publicKeyMissing'));
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return fromBase64(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function derLength(length: number): Uint8Array<ArrayBuffer> {
  if (length < 0x80) return new Uint8Array([length]);
  const bytes: number[] = [];
  let value = length;
  while (value > 0) {
    bytes.unshift(value & 0xff);
    value >>= 8;
  }
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

function derElement(tag: number, content: Uint8Array): Uint8Array<ArrayBuffer> {
  return concatBytes([new Uint8Array([tag]), derLength(content.length), content]);
}

function derInteger(unsigned: Uint8Array): Uint8Array<ArrayBuffer> {
  let start = 0;
  while (start < unsigned.length - 1 && unsigned[start] === 0) start += 1;
  const body = unsigned.subarray(start);
  const content = body[0] !== undefined && body[0] & 0x80 ? concatBytes([new Uint8Array([0]), body]) : body;
  return derElement(0x02, content);
}

const RSA_OID = new Uint8Array([0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01]);
const DER_NULL = new Uint8Array([0x05, 0x00]);

/** Browsers differ on exporting SPKI from a private CryptoKey, so build it from the JWK numbers. */
function spkiFromJwk(jwk: JsonWebKey): Uint8Array<ArrayBuffer> {
  const modulus = base64UrlBytes(jwk.n);
  const exponent = base64UrlBytes(jwk.e);
  const publicKey = derElement(0x30, concatBytes([derInteger(modulus), derInteger(exponent)]));
  const bitString = derElement(0x03, concatBytes([new Uint8Array([0]), publicKey]));
  const algorithm = derElement(0x30, concatBytes([RSA_OID, DER_NULL]));
  return derElement(0x30, concatBytes([algorithm, bitString]));
}

function adbPublicKey(jwk: JsonWebKey, comment: string): string {
  const modulus = base64UrlBytes(jwk.n);
  const exponent = base64UrlBytes(jwk.e);
  const payload = new Uint8Array(8 + modulus.length + exponent.length);
  const view = new DataView(payload.buffer);
  view.setUint32(0, modulus.length);
  payload.set(modulus, 4);
  view.setUint32(4 + modulus.length, exponent.length);
  payload.set(exponent, 8 + modulus.length);
  return `${toBase64(payload)} ${comment}`;
}

function keyComment(): string {
  const host = globalThis.location?.hostname || 'localhost';
  return `NowWebAdb@${host}`;
}

function fingerprintOf(spki: Uint8Array<ArrayBuffer>): Promise<string> {
  return crypto.subtle.digest('SHA-256', spki).then(digest => {
    const bytes = new Uint8Array(digest).subarray(0, 16);
    return Array.from(bytes, value => value.toString(16).padStart(2, '0').toUpperCase()).join(':');
  });
}

export async function describeAdbKey(pkcs8: Uint8Array): Promise<AdbKeyDetails> {
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey('pkcs8', new Uint8Array(pkcs8), RSA_PARAMETERS, true, ['sign']);
  } catch {
    throw new Error(t('connection.adbKey.parseFailed'));
  }
  const jwk = await crypto.subtle.exportKey('jwk', key);
  const spki = spkiFromJwk(jwk);
  return {
    privateKey: pkcs8,
    privatePem: pemBlock('PRIVATE KEY', pkcs8),
    publicPem: pemBlock('PUBLIC KEY', spki),
    publicKey: adbPublicKey(jwk, keyComment()),
    fingerprint: await fingerprintOf(spki),
  };
}

export async function generateAdbKey(): Promise<AdbKeyDetails> {
  const { privateKey } = await crypto.subtle.generateKey(RSA_KEY_PARAMETERS, true, ['sign', 'verify']);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', privateKey));
  return describeAdbKey(pkcs8);
}

function parsePem(text: string): Uint8Array {
  if (/-----BEGIN RSA PRIVATE KEY-----/.test(text)) {
    throw new Error(t('connection.adbKey.pkcs1NotSupported'));
  }
  const match = /-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/.exec(text);
  const body = (match?.[1] ?? '').replace(/\s+/g, '');
  if (!body) throw new Error(t('connection.adbKey.pemBlockMissing'));
  try {
    return fromBase64(body);
  } catch {
    throw new Error(t('connection.adbKey.pemBase64Invalid'));
  }
}

export function parsePrivateKey(data: Uint8Array): Uint8Array {
  const text = new TextDecoder().decode(data);
  const pkcs8 = text.includes('-----BEGIN') ? parsePem(text) : data;
  if (pkcs8[0] !== 0x30 || pkcs8.length < 64) {
    throw new Error(t('connection.adbKey.unknownFile'));
  }
  return pkcs8;
}

export function exportKeyFilename(details: AdbKeyDetails): string {
  return `nowwebadb-${details.fingerprint.replace(/:/g, '').slice(0, 16).toLowerCase()}.pem`;
}
