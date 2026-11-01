import type { FileEntry } from '@zip.js/zip.js';
import { throwIfAborted } from './async';
import type { ProgressHandler } from './types';
import { t } from '@/lib/i18n';

const BUNDLE_PATTERN = /\.(?:apks|xapk)$/i;
const MAX_BUNDLE_BYTES = 4 * 1024 * 1024 * 1024;

export function isBundleFile(file: File): boolean {
  return BUNDLE_PATTERN.test(file.name) && file.size > 0;
}

export interface BundleExtractOptions {
  signal?: AbortSignal;
  onProgress?: ProgressHandler;
}

/** Extracts the APKs (base + splits) from an `.apks` (bundletool) or `.xapk` archive. */
export async function extractApkBundle(file: File, options: BundleExtractOptions = {}): Promise<File[]> {
  const { signal, onProgress = () => {} } = options;
  throwIfAborted(signal);
  const { ZipReader, BlobReader, BlobWriter } = await import('@zip.js/zip.js');
  const reader = new ZipReader(new BlobReader(file));
  try {
    const entries = (await reader.getEntries()).filter(
      (entry): entry is FileEntry => !entry.directory && /\.apk$/i.test(entry.filename),
    );
    if (!entries.length) throw new Error(t('apps.error.bundleNoApk', { name: file.name }));
    const totalBytes = entries.reduce((sum, entry) => sum + entry.uncompressedSize, 0);
    if (totalBytes > MAX_BUNDLE_BYTES) throw new Error(t('apps.error.bundleTooLarge', { name: file.name }));

    const files: File[] = [];
    for (const [index, entry] of entries.entries()) {
      throwIfAborted(signal);
      onProgress({ loaded: index, total: entries.length, phase: t('apps.install.phase.extracting', { name: file.name }), file: entry.filename });
      const blob = await entry.getData(new BlobWriter('application/vnd.android.package-archive'));
      const name = entry.filename.split('/').pop() ?? `split_${index}.apk`;
      files.push(new File([blob], name, { type: 'application/vnd.android.package-archive' }));
    }
    onProgress({ loaded: entries.length, total: entries.length, phase: t('apps.install.phase.extracting', { name: file.name }) });
    return files;
  } finally {
    await reader.close();
  }
}
