import type { Adb } from '@yume-chan/adb';
import { readRange, readTail } from '@/lib/adb/shell';
import { inflateRaw } from './inflate';
import { t } from '@/lib/i18n';

const EOCD_SIGNATURE = 0x06054b50;
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50;
const ZIP64_EOCD_SIGNATURE = 0x06064b50;
const CD_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

export interface ApkEntry {
  name: string;
  flags: number;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

export interface ApkDirectory {
  count: number;
  cdOffset: number;
  cdSize: number;
}

export interface RemoteApkOptions {
  signal?: AbortSignal;
  timeout?: number;
}

export interface ReadEntryOptions extends RemoteApkOptions {
  maxSize?: number;
}

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function safeU64(view: DataView, offset: number, context: string): number {
  const value = view.getBigUint64(offset, true);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(t('apps.apk.valueTooLarge', { context: context }));
  return Number(value);
}

export class RemoteApk {
  readonly entries = new Map<string, ApkEntry>();
  private readonly inflated = new Map<string, Uint8Array>();
  private readonly adb: Adb;
  private readonly path: string;
  private readonly signal: AbortSignal | undefined;
  private readonly timeout: number;
  private directoryPromise: Promise<ApkDirectory> | null = null;

  constructor(adb: Adb, path: string, { signal, timeout = 30000 }: RemoteApkOptions = {}) {
    this.adb = adb;
    this.path = path;
    this.signal = signal;
    this.timeout = timeout;
  }

  async directory(): Promise<ApkDirectory> {
    const cached = this.directoryPromise;
    if (cached) return cached;
    const created = this.loadDirectory().catch((error: unknown) => {
      this.directoryPromise = null;
      throw error;
    });
    this.directoryPromise = created;
    return created;
  }

  async loadDirectory(): Promise<ApkDirectory> {
    const tail = await readTail(this.adb, this.path, 131072, { signal: this.signal, timeout: this.timeout });
    if (!tail.length) throw new Error(t('apps.apk.unreadable'));
    const tailView = viewOf(tail);
    let eocd = -1;
    for (let offset = tail.length - 22; offset >= 0; offset--) {
      if (tailView.getUint32(offset, true) === EOCD_SIGNATURE) {
        eocd = offset;
        break;
      }
    }
    if (eocd < 0) throw new Error(t('apps.apk.directoryInvalid'));
    const commentLength = tailView.getUint16(eocd + 20, true);
    if (eocd + 22 + commentLength > tail.length) throw new Error(t('apps.apk.directoryCommentOverflow'));

    let cdOffset = tailView.getUint32(eocd + 16, true);
    let cdSize = tailView.getUint32(eocd + 12, true);
    let count = tailView.getUint16(eocd + 10, true);
    let zip64 = false;
    if (count === 0xffff || cdOffset === 0xffffffff || cdSize === 0xffffffff) {
      if (eocd < 20 || tailView.getUint32(eocd - 20, true) !== ZIP64_LOCATOR_SIGNATURE) {
        throw new Error(t('apps.apk.zip64Unsupported'));
      }
      const zip64Offset = safeU64(tailView, eocd - 12, t('apps.apk.context.zip64Directory'));
      const zip64Record = await readRange(this.adb, this.path, zip64Offset, 56, {
        signal: this.signal,
        timeout: this.timeout,
      });
      const zip64View = viewOf(zip64Record);
      if (zip64View.getUint32(0, true) !== ZIP64_EOCD_SIGNATURE) throw new Error(t('apps.apk.zip64DirectoryCorrupt'));
      count = safeU64(zip64View, 32, t('apps.apk.context.entryCount'));
      cdSize = safeU64(zip64View, 40, t('apps.apk.context.directory'));
      cdOffset = safeU64(zip64View, 48, t('apps.apk.context.directoryOffset'));
      zip64 = true;
    }
    if (count > 500000 || cdSize > 64 * 1024 * 1024) throw new Error(t('apps.apk.tooManyEntries'));
    if (!count) return { count, cdOffset, cdSize };

    // In ZIP64 archives the directory is separated from EOCD by the ZIP64
    // record and locator, so only trust the tail slice for classic archives.
    let cd: Uint8Array | null = null;
    const cdStartInTail = eocd - cdSize;
    if (!zip64 && cdStartInTail >= 0) {
      const candidate = tail.subarray(cdStartInTail, eocd);
      if (candidate.length >= 46 && viewOf(candidate).getUint32(0, true) === CD_SIGNATURE) cd = candidate;
    }
    if (!cd) {
      cd = await readRange(this.adb, this.path, cdOffset, cdSize, {
        signal: this.signal,
        timeout: this.timeout,
        maxBytes: cdSize + 65536,
      });
    }
    if (cd.length !== cdSize) throw new Error(t('apps.apk.directorySizeMismatch'));

    const cdView = viewOf(cd);
    let position = 0;
    for (let index = 0; index < count; index++) {
      if (position + 46 > cd.length || cdView.getUint32(position, true) !== CD_SIGNATURE) {
        throw new Error(t('apps.apk.directoryEntryCorrupt'));
      }
      const nameLength = cdView.getUint16(position + 28, true);
      const extraLength = cdView.getUint16(position + 30, true);
      const itemCommentLength = cdView.getUint16(position + 32, true);
      const end = position + 46 + nameLength + extraLength + itemCommentLength;
      if (end > cd.length) throw new Error(t('apps.apk.directoryEntryOverflow'));
      const name = new TextDecoder().decode(cd.subarray(position + 46, position + 46 + nameLength));
      const entry: ApkEntry = {
        name,
        flags: cdView.getUint16(position + 8, true),
        method: cdView.getUint16(position + 10, true),
        compressedSize: cdView.getUint32(position + 20, true),
        uncompressedSize: cdView.getUint32(position + 24, true),
        localHeaderOffset: cdView.getUint32(position + 42, true),
      };
      if (
        entry.uncompressedSize === 0xffffffff ||
        entry.compressedSize === 0xffffffff ||
        entry.localHeaderOffset === 0xffffffff
      ) {
        applyZip64Extra(cdView, position + 46 + nameLength, extraLength, entry);
      }
      this.entries.set(name, entry);
      position = end;
    }
    return { count, cdOffset, cdSize };
  }

  async entry(name: string): Promise<ApkEntry | null> {
    await this.directory();
    return this.entries.get(name) || null;
  }

  async hasEntry(name: string): Promise<boolean> {
    return Boolean(await this.entry(name));
  }

  async readEntry(
    name: string,
    { maxSize = 16 * 1024 * 1024, signal, timeout }: ReadEntryOptions = {},
  ): Promise<Uint8Array> {
    const cached = this.inflated.get(name);
    if (cached) return cached;
    const entry = await this.entry(name);
    if (!entry) throw new Error(t('apps.apk.entryMissing', { name: name }));
    if (entry.uncompressedSize > maxSize) throw new Error(t('apps.apk.entryTooLarge', { name: name }));
    if (entry.compressedSize > maxSize * 2 + 1024 * 1024) throw new Error(t('apps.apk.entryCompressedTooLarge', { name: name }));

    const header = await readRange(this.adb, this.path, entry.localHeaderOffset, 30, {
      signal: signal || this.signal,
      timeout: timeout || this.timeout,
    });
    const headerView = viewOf(header);
    if (headerView.getUint32(0, true) !== LOCAL_SIGNATURE) throw new Error(t('apps.apk.entryHeaderCorrupt'));
    const nameLength = headerView.getUint16(26, true);
    const extraLength = headerView.getUint16(28, true);
    const dataOffset = entry.localHeaderOffset + 30 + nameLength + extraLength;
    const compressed = entry.compressedSize
      ? await readRange(this.adb, this.path, dataOffset, entry.compressedSize, {
          signal: signal || this.signal,
          timeout: timeout || this.timeout,
          maxBytes: entry.compressedSize + 65536,
        })
      : new Uint8Array(0);
    let bytes: Uint8Array;
    if (entry.method === 0) bytes = compressed;
    else if (entry.method === 8) bytes = await inflateRaw(compressed, maxSize);
    else throw new Error(t('apps.apk.methodUnsupported', { method: entry.method }));
    if (bytes.length !== entry.uncompressedSize && entry.uncompressedSize !== 0) {
      throw new Error(t('apps.apk.entrySizeMismatch', { name: name }));
    }
    this.inflated.set(name, bytes);
    return bytes;
  }
}

function applyZip64Extra(view: DataView, offset: number, length: number, entry: ApkEntry): void {
  const end = offset + length;
  let position = offset;
  while (position + 4 <= end) {
    const id = view.getUint16(position, true);
    const size = view.getUint16(position + 2, true);
    if (position + 4 + size > end) break;
    if (id === 0x0001) {
      let cursor = position + 4;
      const limit = cursor + size;
      const fields = ['uncompressedSize', 'compressedSize', 'localHeaderOffset'] as const;
      for (const field of fields) {
        if (entry[field] !== 0xffffffff) continue;
        if (cursor + 8 > limit) throw new Error(t('apps.apk.zip64ExtraCorrupt'));
        entry[field] = safeU64(view, cursor, t('apps.apk.context.entry'));
        cursor += 8;
      }
    }
    position += 4 + size;
  }
}
