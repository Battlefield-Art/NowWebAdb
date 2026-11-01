import {
  DemoMode,
  DemoModeMobileDataTypes,
  DemoModeSignalStrength,
  DemoModeStatusBarModes,
  type DemoModeMobileDataType,
  type DemoModeStatusBarMode,
} from '@yume-chan/android-bin';
import type { Adb } from '@yume-chan/adb';

export { DemoModeMobileDataTypes, DemoModeSignalStrength, DemoModeStatusBarModes };
export type { DemoModeMobileDataType, DemoModeStatusBarMode };

export function demoModeService(adb: Adb): DemoMode {
  return new DemoMode(adb);
}

export interface DemoModeState {
  allowed: boolean;
  enabled: boolean;
}

export async function readDemoModeState(adb: Adb): Promise<DemoModeState> {
  const mode = demoModeService(adb);
  const [allowed, enabled] = await Promise.all([mode.getAllowed(), mode.getEnabled()]);
  return { allowed, enabled };
}

export async function setDemoModeEnabled(adb: Adb, enabled: boolean): Promise<void> {
  const mode = demoModeService(adb);
  if (enabled) await mode.setAllowed(true);
  await mode.setEnabled(enabled);
}
