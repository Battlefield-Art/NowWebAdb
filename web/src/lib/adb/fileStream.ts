import type { Adb } from '@yume-chan/adb';
import { ReadableStream } from '@yume-chan/stream-extra';
import { throwIfAborted } from './async';
import { withSync } from './files';
import type { ProgressHandler, ShellOptions } from './types';
import { t } from '@/lib/i18n';

export interface WriteFileOptions {
  mode?: number;
  mtime?: Date;
  signal?: AbortSignal;
  onProgress?: ProgressHandler;
}

export interface DownloadOptions extends ShellOptions {
  maxBytes?: number;
  total?: number;
  onProgress?: (loaded: number, total: number) => void;
}

const CHUNK_SIZE = 1024 * 1024;
const DEFAULT_DOWNLOAD_LIMIT = 1024 * 1024 * 1024;

/** Reads at most `length` bytes from the beginning of a file. */
export async function readFileHead(
  adb: Adb,
  path: string,
  length: number,
  options: ShellOptions = {},
): Promise<Uint8Array> {
  const limit = Math.max(1, Math.floor(length));
  return withSync(
    adb,
    async sync => {
      const reader = sync.read(path).getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      try {
        while (total < limit) {
          throwIfAborted(options.signal);
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = value.byteLength > limit - total ? value.subarray(0, limit - total) : value;
          chunks.push(chunk);
          total += chunk.byteLength;
        }
      } finally {
        try {
          await reader.cancel();
        } catch {
          /* already closed */
        }
        try {
          reader.releaseLock();
        } catch {
          /* already released */
        }
      }
      const result = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return result;
    },
    options.signal,
  );
}

type WritableFile = Uint8Array | Blob;

function sizeOf(file: WritableFile): number {
  return file instanceof Blob ? file.size : file.byteLength;
}

function openStream(file: WritableFile, onProgress?: ProgressHandler): ReadableStream<Uint8Array> {
  let offset = 0;
  const total = sizeOf(file);
  const slice = async (start: number, end: number): Promise<Uint8Array> => {
    if (file instanceof Blob) return new Uint8Array(await file.slice(start, end).arrayBuffer());
    return file.subarray(start, end);
  };
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const end = Math.min(offset + CHUNK_SIZE, total);
      const chunk = await slice(offset, end);
      offset = end;
      if (chunk.byteLength) controller.enqueue(chunk);
      onProgress?.({ loaded: offset, total, phase: t('apps.install.phase.upload') });
      if (offset >= total) controller.close();
    },
  });
}

export async function writeFile(
  adb: Adb,
  path: string,
  file: WritableFile,
  options: WriteFileOptions = {},
): Promise<void> {
  const total = sizeOf(file);
  const mtime = Math.floor((options.mtime ?? new Date()).getTime() / 1000);
  throwIfAborted(options.signal);
  await withSync(
    adb,
    sync =>
      sync.write({
        filename: path,
        file: openStream(file, options.onProgress),
        permission: options.mode ?? 0o644,
        mtime,
      }),
    options.signal,
  );
  options.onProgress?.({ loaded: total, total, phase: t('common.done') });
}

async function streamFile(
  adb: Adb,
  path: string,
  options: DownloadOptions,
  consume: (chunk: Uint8Array) => void | Promise<void>,
): Promise<number> {
  const maxBytes = options.maxBytes ?? DEFAULT_DOWNLOAD_LIMIT;
  return withSync(
    adb,
    async sync => {
      const reader = sync.read(path).getReader();
      let loaded = 0;
      try {
        for (;;) {
          throwIfAborted(options.signal);
          const { value, done } = await reader.read();
          if (done) break;
          loaded += value.byteLength;
          if (loaded > maxBytes) throw new Error(t('files.error.downloadLimit'));
          await consume(value);
          options.onProgress?.(loaded, options.total && options.total > 0 ? options.total : loaded);
        }
      } finally {
        try {
          await reader.cancel();
        } catch {
          /* already closed */
        }
        try {
          reader.releaseLock();
        } catch {
          /* already released */
        }
      }
      return loaded;
    },
    options.signal,
  );
}

export async function downloadFile(
  adb: Adb,
  path: string,
  options: DownloadOptions = {},
): Promise<Blob> {
  const chunks: Uint8Array[] = [];
  const loaded = await streamFile(adb, path, options, chunk => {
    chunks.push(chunk);
  });
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Blob([bytes], { type: 'application/octet-stream' });
}

export async function streamFileToWritable(
  adb: Adb,
  path: string,
  writable: FileSystemWritableFileStream,
  options: DownloadOptions = {},
): Promise<number> {
  try {
    return await streamFile(adb, path, options, chunk =>
      writable.write(chunk as Uint8Array<ArrayBuffer>),
    );
  } finally {
    await writable.close().catch(() => undefined);
  }
}
