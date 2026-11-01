import type { InstalledApp } from '@/lib/adb/packages';

const SYSTEM_PREFIXES = ['/system/', '/system_ext/', '/product/', '/vendor/', '/apex/', '/odm/'];

export function isSystemApp(app: InstalledApp): boolean {
  const path = app.sourceDir || '';
  return SYSTEM_PREFIXES.some(prefix => path.startsWith(prefix));
}
