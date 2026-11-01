import { t } from '@/lib/i18n';

const utf8Decoder = new TextDecoder('utf-8');
const utf16Decoder = new TextDecoder('utf-16le');

export const RES_STRING_POOL_TYPE = 0x0001;

export interface ChunkHeader {
  type: number;
  headerSize: number;
  size: number;
}

export interface StringPool {
  strings: string[];
  size: number;
  headerSize: number;
}

export interface ResValue {
  size: number;
  dataType: number;
  data: number;
}

export function asDataView(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export function hasChunk(bytes: Uint8Array, _view: DataView, offset: number, minSize = 8): boolean {
  return offset >= 0 && offset + minSize <= bytes.length;
}

export function readChunkHeader(view: DataView, offset: number): ChunkHeader {
  return {
    type: view.getUint16(offset, true),
    headerSize: view.getUint16(offset + 2, true),
    size: view.getUint32(offset + 4, true),
  };
}

export function parseStringPool(
  bytes: Uint8Array,
  offset: number,
  expectedType = RES_STRING_POOL_TYPE,
): StringPool {
  const view = asDataView(bytes);
  if (!hasChunk(bytes, view, offset, 28)) throw new Error(t('apps.stringPool.overflow'));
  const { type, headerSize, size } = readChunkHeader(view, offset);
  if (type !== expectedType) throw new Error(t('apps.stringPool.notPool'));
  if (headerSize < 28 || size < headerSize || offset + size > bytes.length) throw new Error(t('apps.stringPool.corrupt'));
  const count = view.getUint32(offset + 8, true);
  const flags = view.getUint32(offset + 16, true);
  const stringsStart = view.getUint32(offset + 20, true);
  if (count > 200000 || headerSize + count * 4 > size || stringsStart > size) throw new Error(t('apps.stringPool.indexInvalid'));
  const utf8 = (flags & 0x100) !== 0;
  const strings = new Array<string>(count);
  for (let index = 0; index < count; index++) {
    const stringOffset = view.getUint32(offset + headerSize + index * 4, true);
    const base = offset + stringsStart + stringOffset;
    if (base >= offset + size || base >= bytes.length) {
      strings[index] = '';
      continue;
    }
    strings[index] = utf8
      ? decodeUtf8String(bytes, base, offset + size)
      : decodeUtf16String(bytes, base, offset + size);
  }
  return { strings, size, headerSize };
}

function decodeUtf8String(bytes: Uint8Array, start: number, end: number): string {
  let offset = start;
  const first = bytes[offset];
  if (first === undefined) return '';
  offset += 1;
  let chars = first;
  if (chars & 0x80) {
    const next = bytes[offset];
    if (next === undefined) return '';
    offset += 1;
    chars = ((chars & 0x7f) << 8) | next;
  }
  const lengthByte = bytes[offset];
  if (lengthByte === undefined) return '';
  offset += 1;
  let byteLength = lengthByte;
  if (byteLength & 0x80) {
    const next = bytes[offset];
    if (next === undefined) return '';
    offset += 1;
    byteLength = ((byteLength & 0x7f) << 8) | next;
  }
  if (offset + byteLength > end) return '';
  return utf8Decoder.decode(bytes.subarray(offset, offset + byteLength)).replace(/\0.*$/s, '');
}

function decodeUtf16String(bytes: Uint8Array, start: number, end: number): string {
  if (start + 2 > end) return '';
  const view = asDataView(bytes);
  let offset = start;
  let chars = view.getUint16(offset, true);
  offset += 2;
  if (chars & 0x8000) {
    if (offset + 2 > end) return '';
    chars = ((chars & 0x7fff) << 16) | view.getUint16(offset, true);
    offset += 2;
  }
  if (offset + chars * 2 > end) return '';
  return utf16Decoder.decode(bytes.subarray(offset, offset + chars * 2)).replace(/\0.*$/s, '');
}

export const VALUE_TYPE = {
  NULL: 0x00,
  REFERENCE: 0x01,
  ATTRIBUTE: 0x02,
  STRING: 0x03,
  FLOAT: 0x04,
  DIMENSION: 0x05,
  FRACTION: 0x06,
  INT_DEC: 0x10,
  INT_HEX: 0x11,
  INT_BOOLEAN: 0x12,
  FIRST_COLOR: 0x1c,
  LAST_COLOR: 0x1f,
} as const;

export function readResValue(view: DataView, offset: number): ResValue {
  return {
    size: view.getUint16(offset, true),
    dataType: view.getUint8(offset + 3),
    data: view.getUint32(offset + 4, true),
  };
}

export function colorToCss(value: number): string {
  const argb = value >>> 0;
  const alpha = ((argb >>> 24) & 0xff) / 255;
  const red = (argb >>> 16) & 0xff;
  const green = (argb >>> 8) & 0xff;
  const blue = argb & 0xff;
  return alpha >= 1
    ? `#${hex(red)}${hex(green)}${hex(blue)}`
    : `rgba(${red},${green},${blue},${alpha.toFixed(3)})`;
}

function hex(value: number): string {
  return value.toString(16).padStart(2, '0');
}

export function parseColorText(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^#([0-9a-f]{3,8})$/i.exec(value.trim());
  if (!match) return null;
  let digits = match[1];
  if (digits === undefined) return null;
  if (digits.length === 3 || digits.length === 4) digits = digits.split('').map(part => part + part).join('');
  if (digits.length === 6) digits = `ff${digits}`;
  if (digits.length !== 8) return null;
  return Number.parseInt(digits, 16) >>> 0;
}
