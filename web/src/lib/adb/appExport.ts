import type { Adb } from '@yume-chan/adb';
import { throwIfAborted } from './async';
import { withSync } from './files';
import { getPackageSources, validateApkPath } from './packages';
import type { ProgressHandler } from './types';
import { t } from '@/lib/i18n';

export interface ExportOptions {
  signal?: AbortSignal;
  onProgress?: ProgressHandler;
}

export interface ExportedApk {
  blob: Blob;
  filename: string;
}

export async function exportAppApks(adb: Adb, packageName: string, options: ExportOptions = {}): Promise<ExportedApk> {
  const { signal, onProgress = () => {} } = options;
  const sources = (await getPackageSources(adb, packageName, signal)).map(validateApkPath);
  if (!sources.length) throw new Error(t('apps.error.noApkSource'));
  const blobs = await withSync(
    adb,
    async sync => {
      const result: Blob[] = [];
      let loaded = 0;
      for (const [index, source] of sources.entries()) {
        const reader = sync.read(source).getReader();
        const chunks: Uint8Array[] = [];
        for (;;) {
          throwIfAborted(signal);
          const { value, done } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.byteLength;
          onProgress({ loaded, total: 0, phase: t('apps.export.phase.readingApk'), file: source });
        }
        reader.releaseLock();
        const blob = new Blob(chunks as BlobPart[], { type: 'application/vnd.android.package-archive' });
        if (!blob.size) throw new Error(t('apps.error.emptyApk', { path: source }));
        onProgress({ loaded, total: loaded, phase: t('apps.export.phase.readingApk'), file: source });
        result[index] = blob;
      }
      return result;
    },
    signal,
  );
  if (blobs.length === 1) return { blob: blobs[0] as Blob, filename: `${packageName}.apk` };
  const { ZipWriter, BlobWriter, BlobReader } = await import('@zip.js/zip.js');
  const writer = new ZipWriter(new BlobWriter('application/zip'));
  for (const [index, source] of sources.entries()) {
    const basename = source.split('/').pop()?.replace(/[^A-Za-z0-9_.-]/g, '_') ?? `split_${index}.apk`;
    await writer.add(`${index}_${basename}`, new BlobReader(blobs[index] as Blob), { level: 0, signal });
  }
  const blob = await writer.close();
  return { blob, filename: `${packageName}-apks.zip` };
}
