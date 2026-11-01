import { Settings, SettingsResetMode, type SettingsNamespace, type SettingsPutOptions } from '@yume-chan/android-bin';
import type { Adb } from '@yume-chan/adb';

export { SettingsResetMode };
export type { SettingsNamespace, SettingsPutOptions };

export function settingsService(adb: Adb): Settings {
  return new Settings(adb);
}

export async function getSetting(adb: Adb, namespace: SettingsNamespace, key: string): Promise<string> {
  return new Settings(adb).get(namespace, key);
}

export async function putSetting(
  adb: Adb,
  namespace: SettingsNamespace,
  key: string,
  value: string,
  options?: SettingsPutOptions,
): Promise<void> {
  await new Settings(adb).put(namespace, key, value, options);
}

export async function deleteSetting(adb: Adb, namespace: SettingsNamespace, key: string): Promise<void> {
  await new Settings(adb).delete(namespace, key);
}

export async function resetSetting(
  adb: Adb,
  namespace: SettingsNamespace,
  mode: SettingsResetMode,
): Promise<void> {
  await new Settings(adb).reset(namespace, mode);
}
