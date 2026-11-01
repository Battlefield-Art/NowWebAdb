import { asDataView, hasChunk, parseStringPool, readChunkHeader, readResValue } from './binary';
import { createResources } from './resources';
import type { ParsedResources, ResConfig, ResourceEntry, ResourcePackage } from './resources';
import { t } from '@/lib/i18n';

const RES_TABLE_TYPE = 0x0002;
const RES_TABLE_PACKAGE_TYPE = 0x0200;
const RES_TABLE_TYPE_TYPE = 0x0201;
const RES_TABLE_TYPE_SPEC_TYPE = 0x0202;
const FLAG_SPARSE = 0x01;
const FLAG_OFFSET16 = 0x02;
const ENTRY_FLAG_COMPLEX = 0x0001;
const ENTRY_FLAG_COMPACT = 0x0008;
const DENSITY_ANY = 0xfffe;
const DENSITY_NONE = 0xffff;

interface ParsedEntryValue {
  key: string;
  dataType: number;
  data: number;
}

export function parseArsc(bytes: Uint8Array): ParsedResources {
  const view = asDataView(bytes);
  if (!hasChunk(bytes, view, 0, 12) || view.getUint16(0, true) !== RES_TABLE_TYPE) {
    throw new Error(t('apps.arsc.invalid'));
  }
  const headerSize = view.getUint16(2, true);
  const totalSize = Math.min(view.getUint32(4, true), bytes.length);
  const packageCount = view.getUint32(8, true);
  const globalStrings: string[] = [];
  const entries = new Map<number, ResourceEntry[]>();
  const packages: ResourcePackage[] = [];
  let position = headerSize;
  while (position + 8 <= totalSize) {
    const { type, size } = readChunkHeader(view, position);
    if (size < 8 || position + size > totalSize) throw new Error(t('apps.arsc.blockOverflow'));
    if (type === 0x0001 && !globalStrings.length) {
      const pool = parseStringPool(bytes, position);
      globalStrings.push(...pool.strings);
    } else if (type === RES_TABLE_PACKAGE_TYPE) {
      packages.push(parsePackage(bytes, view, position, size, entries));
    }
    position += size;
    if (packages.length > packageCount + 16) break;
  }
  if (!globalStrings.length) throw new Error(t('apps.arsc.noStringPool'));
  return createResources(globalStrings, entries, packages);
}

function parsePackage(
  bytes: Uint8Array,
  view: DataView,
  start: number,
  size: number,
  entries: Map<number, ResourceEntry[]>,
): ResourcePackage {
  const headerSize = view.getUint16(start + 2, true);
  if (headerSize < 284 || start + headerSize > start + size) throw new Error(t('apps.arsc.headerCorrupt'));
  const packageId = view.getUint32(start + 8, true);
  const typeStrings = view.getUint32(start + 268, true);
  const keyStrings = view.getUint32(start + 276, true);
  const typeIdOffset = headerSize >= 288 ? view.getUint32(start + 284, true) : 0;
  if (!typeStrings || !keyStrings) throw new Error(t('apps.arsc.noStringTable'));
  const typePool = parseStringPool(bytes, start + typeStrings).strings;
  const keyPoolChunk = parseStringPool(bytes, start + keyStrings);
  const keyPool = keyPoolChunk.strings;
  let position = start + keyStrings + keyPoolChunk.size;
  const end = start + size;
  let count = 0;
  while (position + 8 <= end) {
    const { type, size: chunkSize } = readChunkHeader(view, position);
    if (chunkSize < 8 || position + chunkSize > end) break;
    if (type === RES_TABLE_TYPE_TYPE) {
      parseType(bytes, view, position, chunkSize, { packageId, typeIdOffset, typePool, keyPool, entries });
      if (++count > 200000) break;
    } else if (type !== RES_TABLE_TYPE_SPEC_TYPE) {
      // Library/overlay/staged-alias chunks are irrelevant for labels and icons.
    }
    position += chunkSize;
  }
  return { packageId, typePool, keyPool };
}

interface TypeContext {
  packageId: number;
  typeIdOffset: number;
  typePool: string[];
  keyPool: string[];
  entries: Map<number, ResourceEntry[]>;
}

function parseType(bytes: Uint8Array, view: DataView, start: number, size: number, context: TypeContext): void {
  const { packageId, typeIdOffset, typePool, keyPool, entries } = context;
  const headerSize = view.getUint16(start + 2, true);
  if (headerSize < 20 || start + headerSize > start + size) return;
  const typeId = view.getUint8(start + 8);
  const flags = view.getUint8(start + 9);
  const entryCount = view.getUint32(start + 12, true);
  const entriesStart = view.getUint32(start + 16, true);
  if (entryCount > 2000000) throw new Error(t('apps.arsc.tooManyEntries'));
  const configSize = headerSize - 20;
  const density = configSize >= 16 ? view.getUint16(start + 20 + 14, true) : 0;
  const language = configSize >= 10 ? readLocalePart(bytes, start + 20 + 8) : '';
  const country = configSize >= 12 ? readLocalePart(bytes, start + 20 + 10) : '';
  const config: ResConfig = { density, language, country };
  const typeName = typePool[typeId - 1] || '';
  const resourceTypeId = typeId + typeIdOffset;
  const offsetsStart = start + headerSize;
  const dataStart = start + entriesStart;
  const chunkEnd = start + size;

  for (let index = 0; index < entryCount; index++) {
    let entryIndex = index;
    let offset: number;
    if (flags & FLAG_SPARSE) {
      if (offsetsStart + index * 4 + 4 > chunkEnd) break;
      entryIndex = view.getUint16(offsetsStart + index * 4, true);
      offset = view.getUint16(offsetsStart + index * 4 + 2, true) * 4;
    } else if (flags & FLAG_OFFSET16) {
      if (offsetsStart + index * 2 + 2 > chunkEnd) break;
      const value = view.getUint16(offsetsStart + index * 2, true);
      if (value === 0xffff) continue;
      offset = value * 4;
    } else {
      if (offsetsStart + index * 4 + 4 > chunkEnd) break;
      const value = view.getUint32(offsetsStart + index * 4, true);
      if (value === 0xffffffff) continue;
      offset = value;
    }
    const entryOffset = dataStart + offset;
    if (entryOffset + 8 > chunkEnd) continue;
    const entry = parseEntry(view, entryOffset, chunkEnd, keyPool);
    if (!entry) continue;
    const resId = ((packageId << 24) | (resourceTypeId << 16) | entryIndex) >>> 0;
    let list = entries.get(resId);
    if (!list) {
      list = [];
      entries.set(resId, list);
    }
    list.push({ ...entry, config, typeName });
  }
}

function parseEntry(
  view: DataView,
  offset: number,
  chunkEnd: number,
  keyPool: string[],
): ParsedEntryValue | null {
  const sizeOrKey = view.getUint16(offset, true);
  const flags = view.getUint16(offset + 2, true);
  if (flags & ENTRY_FLAG_COMPACT) {
    if (offset + 8 > chunkEnd) return null;
    return {
      key: keyPool[sizeOrKey] || '',
      dataType: (flags >>> 8) & 0xff,
      data: view.getUint32(offset + 4, true),
    };
  }
  if (sizeOrKey < 8 || offset + sizeOrKey + 8 > chunkEnd) return null;
  if (flags & ENTRY_FLAG_COMPLEX) return null;
  const key = keyPool[view.getUint32(offset + 4, true)] || '';
  const value = readResValue(view, offset + sizeOrKey);
  return { key, dataType: value.dataType, data: value.data };
}

function readLocalePart(bytes: Uint8Array, offset: number): string {
  if (offset + 2 > bytes.length) return '';
  const first = bytes[offset];
  const second = bytes[offset + 1];
  if (first === undefined || second === undefined) return '';
  if (first === 0 && second === 0) return '';
  if (first & 0x80) return 'zz';
  return String.fromCharCode(first, second).replace(/\0/g, '').toLowerCase();
}

export function densityScore(density: number): number {
  if (density === DENSITY_ANY) return 700;
  if (density === DENSITY_NONE) return 0;
  return density || 0;
}
