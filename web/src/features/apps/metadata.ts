import type { Adb } from '@yume-chan/adb';
import type { InstalledApp } from '@/lib/adb/packages';
import { t } from '@/lib/i18n';
import { extractAppInfo } from '@/lib/apk/info';

export interface AppMetadata {
  appName: string;
  icon: string;
  versionName: string;
  versionCode: number | undefined;
  error?: string;
}

interface CacheEntry {
  value: AppMetadata;
  usedAt: number;
}

const CACHE_LIMIT = 600;
const caches = new WeakMap<Adb, Map<string, CacheEntry>>();
let clock = 0;

function cacheFor(adb: Adb): Map<string, CacheEntry> {
  let cache = caches.get(adb);
  if (!cache) {
    cache = new Map();
    caches.set(adb, cache);
  }
  return cache;
}

export function readCachedMetadata(adb: Adb, packageName: string): AppMetadata | undefined {
  const cache = caches.get(adb);
  const entry = cache?.get(packageName);
  if (!entry) return undefined;
  clock += 1;
  entry.usedAt = clock;
  return entry.value;
}

function storeMetadata(adb: Adb, packageName: string, value: AppMetadata): void {
  const cache = cacheFor(adb);
  clock += 1;
  cache.set(packageName, { value, usedAt: clock });
  if (cache.size <= CACHE_LIMIT) return;
  let oldestKey = '';
  let oldest = Infinity;
  for (const [key, entry] of cache) {
    if (entry.usedAt < oldest) {
      oldest = entry.usedAt;
      oldestKey = key;
    }
  }
  cache.delete(oldestKey);
}

export function clearMetadataCache(adb: Adb, packageName?: string): void {
  if (packageName) cacheFor(adb).delete(packageName);
  else caches.delete(adb);
}

export function clearFailedMetadata(adb: Adb): void {
  const cache = caches.get(adb);
  if (!cache) return;
  for (const [key, entry] of cache) {
    if (entry.value.error) cache.delete(key);
  }
}

export async function loadAppMetadata(adb: Adb, app: InstalledApp, signal: AbortSignal): Promise<AppMetadata> {
  const cached = readCachedMetadata(adb, app.packageName);
  if (cached && !cached.error) return cached;
  signal.throwIfAborted();
  const fallback: AppMetadata = {
    appName: app.packageName,
    icon: '',
    versionName: '',
    versionCode: app.versionCode,
  };
  if (!app.sourceDir) {
    return { ...fallback, error: t('apps.metadata.missingApkPath') };
  }
  try {
    const info = await extractAppInfo(
      adb,
      { packageName: app.packageName, sourceDir: app.sourceDir, versionCode: app.versionCode },
      { signal, timeout: 20000 },
    );
    const value: AppMetadata = {
      appName: info.appName || app.packageName,
      icon: info.iconBase64,
      versionName: info.versionName,
      versionCode: info.versionCode,
    };
    storeMetadata(adb, app.packageName, value);
    return value;
  } catch (error) {
    signal.throwIfAborted();
    const message = error instanceof Error ? error.message : t('common.readFailed');
    return { ...fallback, error: message };
  }
}
