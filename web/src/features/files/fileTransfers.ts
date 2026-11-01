import type { Adb } from '@yume-chan/adb';
import type { RemoteFile } from '@/lib/adb/files';
import { readFile } from '@/lib/adb/files';
import { downloadFile, streamFileToWritable, writeFile } from '@/lib/adb/fileStream';
import { joinRemotePath, validateRemoteName } from '@/lib/adb/paths';
import { throwIfAborted } from '@/lib/adb/async';
import { saveToDisk, timestampForFilename } from '@/lib/utils/download';
import { createSaveTarget } from '@/lib/utils/save-file';
import { t } from '@/lib/i18n';

export interface FileTransferProgress {
  index: number;
  count: number;
  name: string;
  loaded: number;
  total: number;
  phase: string;
}

export interface FileTransferOptions {
  signal?: AbortSignal;
  onProgress?: (progress: FileTransferProgress) => void;
}

const ZIP_MEMORY_LIMIT = 512 * 1024 * 1024;

export async function uploadFiles(
  adb: Adb,
  directory: string,
  files: readonly File[],
  { signal, onProgress }: FileTransferOptions = {},
): Promise<number> {
  let uploaded = 0;
  for (const [index, file] of files.entries()) {
    throwIfAborted(signal);
    const name = validateRemoteName(file.name);
    const target = joinRemotePath(directory, name);
    await writeFile(adb, target, file, {
      signal,
      onProgress: ({ loaded }) =>
        onProgress?.({
          index,
          count: files.length,
          name,
          loaded,
          total: file.size,
          phase: t('files.transfer.phase.upload'),
        }),
    });
    onProgress?.({
      index,
      count: files.length,
      name,
      loaded: file.size,
      total: file.size,
      phase: t('common.done'),
    });
    uploaded += 1;
  }
  return uploaded;
}

export interface DownloadResult {
  filename: string;
  count: number;
}

function requireFiles(entries: readonly RemoteFile[]): RemoteFile[] {
  const files = entries.filter(entry => !entry.isDirectory);
  if (!files.length) throw new Error(t('files.error.selectFile'));
  return files;
}

async function saveSingleFile(
  adb: Adb,
  entry: RemoteFile,
  { signal, onProgress }: FileTransferOptions,
): Promise<DownloadResult | null> {
  const target = await createSaveTarget(entry.name);
  if (target) {
    await streamFileToWritable(adb, entry.path, target, {
      signal,
      total: entry.size,
      onProgress: (loaded, total) =>
        onProgress?.({ index: 0, count: 1, name: entry.name, loaded, total, phase: t('files.transfer.phase.download') }),
    });
    return { filename: entry.name, count: 1 };
  }

  const blob = await downloadFile(adb, entry.path, {
    signal,
    total: entry.size,
    onProgress: (loaded, total) =>
      onProgress?.({ index: 0, count: 1, name: entry.name, loaded, total, phase: t('files.transfer.phase.download') }),
  });
  saveToDisk(blob, entry.name);
  return { filename: entry.name, count: 1 };
}

async function saveZip(
  adb: Adb,
  entries: readonly RemoteFile[],
  { signal, onProgress }: FileTransferOptions,
): Promise<DownloadResult> {
  const totalBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  if (totalBytes > ZIP_MEMORY_LIMIT) {
    throw new Error(t('files.error.tooLarge'));
  }
  const { ZipWriter, BlobWriter, Uint8ArrayReader } = await import('@zip.js/zip.js');
  const writer = new ZipWriter(new BlobWriter('application/zip'));
  try {
    const used = new Set<string>();
    for (const [index, entry] of entries.entries()) {
      throwIfAborted(signal);
      onProgress?.({
        index,
        count: entries.length,
        name: entry.name,
        loaded: 0,
        total: entry.size,
        phase: t('files.transfer.phase.zip'),
      });
      const bytes = await readFile(adb, entry.path, { signal, maxBytes: ZIP_MEMORY_LIMIT });
      let name = entry.name;
      if (used.has(name)) name = `${index}_${name}`;
      used.add(name);
      await writer.add(name, new Uint8ArrayReader(bytes), { level: 0 });
      onProgress?.({
        index,
        count: entries.length,
        name,
        loaded: entry.size,
        total: entry.size,
        phase: t('files.transfer.phase.zipped'),
      });
    }
    const blob = await writer.close();
    const filename = `nowwebadb-files-${timestampForFilename()}.zip`;
    saveToDisk(blob, filename);
    return { filename, count: entries.length };
  } catch (error) {
    await writer.close().catch(() => undefined);
    throw error;
  }
}

/** Downloads the selected files, returning `null` when the user cancels the save dialog. */
export async function downloadFiles(
  adb: Adb,
  entries: readonly RemoteFile[],
  options: FileTransferOptions = {},
): Promise<DownloadResult | null> {
  const files = requireFiles(entries);
  if (files.length === 1) {
    const file = files[0] as RemoteFile;
    return saveSingleFile(adb, file, options);
  }
  return saveZip(adb, files, options);
}
