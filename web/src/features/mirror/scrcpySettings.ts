import {
  DEFAULT_SCRCPY_SETTINGS,
  normalizeScrcpySettings,
  type ScrcpySettings,
} from '@/lib/adb/scrcpySettings';

const STORAGE_KEY = 'nowwebadb.mirror.settings';

export function loadScrcpySettings(): ScrcpySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SCRCPY_SETTINGS };
    return normalizeScrcpySettings(JSON.parse(raw) as Partial<ScrcpySettings>);
  } catch {
    return { ...DEFAULT_SCRCPY_SETTINGS };
  }
}

export function saveScrcpySettings(settings: ScrcpySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* Storage may be unavailable in private mode. */
  }
}
