import { AdbBackup } from '@yume-chan/android-bin';
import type { Adb } from '@yume-chan/adb';
import type { MaybeConsumable, ReadableStream } from '@yume-chan/stream-extra';
import { timestampForFilename } from '@/lib/utils/download';
import { throwIfAborted } from './async';
import { validatePackageName } from './packages';
import { t } from '@/lib/i18n';

export type BackupScope = 'user' | 'all' | 'packages';

export interface BackupRequest {
  scope: BackupScope;
  packages: readonly string[];
  user: number;
  saveSharedStorage: boolean;
  saveWidgets: boolean;
  savePackageApk: boolean;
  savePackageObb: boolean;
  savePackageKeyValue: boolean;
  compress: boolean;
}

export const DEFAULT_BACKUP_REQUEST: BackupRequest = {
  scope: 'user',
  packages: [],
  user: 0,
  saveSharedStorage: false,
  saveWidgets: false,
  savePackageApk: true,
  savePackageObb: true,
  savePackageKeyValue: true,
  compress: true,
};

function normalizePackages(value: readonly string[] | undefined): string[] {
  const packages = [...new Set((value ?? []).map(item => item.trim()).filter(Boolean))];
  if (!packages.length) throw new Error(t('connection.backupService.needPackages'));
  packages.forEach(validatePackageName);
  return packages;
}

export function normalizeBackupRequest(value: Partial<BackupRequest> = {}): BackupRequest {
  const user = Number(value.user ?? 0);
  if (!Number.isInteger(user) || user < 0 || user > 999) throw new Error(t('connection.backupService.invalidUser'));
  const scope: BackupScope = value.scope === 'all' ? 'all' : value.scope === 'packages' ? 'packages' : 'user';
  return {
    scope,
    packages: scope === 'packages' ? normalizePackages(value.packages) : [],
    user,
    saveSharedStorage: value.saveSharedStorage ?? DEFAULT_BACKUP_REQUEST.saveSharedStorage,
    saveWidgets: value.saveWidgets ?? DEFAULT_BACKUP_REQUEST.saveWidgets,
    savePackageApk: value.savePackageApk ?? DEFAULT_BACKUP_REQUEST.savePackageApk,
    savePackageObb: value.savePackageObb ?? DEFAULT_BACKUP_REQUEST.savePackageObb,
    savePackageKeyValue: value.savePackageKeyValue ?? DEFAULT_BACKUP_REQUEST.savePackageKeyValue,
    compress: value.compress ?? DEFAULT_BACKUP_REQUEST.compress,
  };
}

const MAX_BACKUP_BYTES = 1024 * 1024 * 1024;

export interface BackupDownloadOptions {
  signal?: AbortSignal;
  maxBytes?: number;
  onProgress?: (bytes: number) => void;
}

export interface BackupFile {
  blob: Blob;
  filename: string;
  bytes: number;
}

export async function downloadDeviceBackup(
  adb: Adb,
  request: BackupRequest,
  options: BackupDownloadOptions = {},
): Promise<BackupFile> {
  throwIfAborted(options.signal);
  const normalized = normalizeBackupRequest(request);
  const stream = await new AdbBackup(adb).backup({
    user: normalized.user,
    saveSharedStorage: normalized.saveSharedStorage,
    saveWidgets: normalized.saveWidgets,
    packages: normalized.scope === 'packages' ? normalized.packages : normalized.scope,
    savePackageApk: normalized.savePackageApk,
    savePackageObb: normalized.savePackageObb,
    savePackageKeyValue: normalized.savePackageKeyValue,
    compress: normalized.compress,
  });
  const maxBytes = options.maxBytes ?? MAX_BACKUP_BYTES;
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      throwIfAborted(options.signal);
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error(t('connection.backupService.tooLarge'));
      chunks.push(value);
      options.onProgress?.(total);
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
      /* released */
    }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return {
    blob: new Blob([bytes], { type: 'application/octet-stream' }),
    filename: `backup-${timestampForFilename()}.ab`,
    bytes: total,
  };
}

export interface RestoreRequest {
  user: number;
  file: File;
}

export async function restoreDeviceBackup(adb: Adb, request: RestoreRequest): Promise<string> {
  const user = Number(request.user);
  if (!Number.isInteger(user) || user < 0 || user > 999) throw new Error(t('connection.backupService.invalidUser'));
  const file = request.file.stream() as ReadableStream<MaybeConsumable<Uint8Array>>;
  return new AdbBackup(adb).restore({ user, file });
}
