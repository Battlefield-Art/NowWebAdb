import type { Adb } from '@yume-chan/adb';
import { exportAppApks } from '@/lib/adb/appExport';
import { throwIfAborted } from '@/lib/adb/async';
import { t } from '@/lib/i18n';
import { timestampForFilename } from '@/lib/utils/download';

export interface AppExportProgress {
  index: number;
  total: number;
  packageName: string;
  phase: string;
  loaded: number;
}

export interface AppExportOptions {
  signal?: AbortSignal;
  onProgress?: (event: AppExportProgress) => void;
}

export interface AppExportResult {
  blob: Blob;
  filename: string;
}

export async function exportSelectedApps(
  adb: Adb,
  packageNames: readonly string[],
  { signal, onProgress = () => {} }: AppExportOptions = {},
): Promise<AppExportResult> {
  if (!packageNames.length) throw new Error(t('apps.export.noSelection'));
  const collected: AppExportResult[] = [];
  for (const [index, packageName] of packageNames.entries()) {
    throwIfAborted(signal);
    onProgress({
      index,
      total: packageNames.length,
      packageName,
      phase: t('apps.export.phase.readingApk'),
      loaded: 0,
    });
    const result = await exportAppApks(adb, packageName, {
      signal,
      onProgress: event => onProgress({
        index,
        total: packageNames.length,
        packageName,
        phase: event.phase,
        loaded: event.loaded,
      }),
    });
    collected.push(result);
  }
  if (collected.length === 1) return collected[0] as AppExportResult;

  const { ZipWriter, BlobWriter, BlobReader } = await import('@zip.js/zip.js');
  const writer = new ZipWriter(new BlobWriter('application/zip'));
  try {
    const used = new Set<string>();
    for (const [index, item] of collected.entries()) {
      let name = item.filename;
      if (used.has(name)) name = `${index}_${name}`;
      used.add(name);
      await writer.add(name, new BlobReader(item.blob), { level: 0, signal });
    }
    const blob = await writer.close();
    return { blob, filename: `nowwebadb-apps-${timestampForFilename()}.zip` };
  } catch (error) {
    await writer.close().catch(() => undefined);
    throw error;
  }
}
