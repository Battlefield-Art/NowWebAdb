import { OverlayDisplay, type OverlayDisplayDevice, type OverlayDisplayDeviceMode } from '@yume-chan/android-bin';
import type { Adb } from '@yume-chan/adb';

export type { OverlayDisplayDevice, OverlayDisplayDeviceMode };

export function overlayDisplayService(adb: Adb): OverlayDisplay {
  return new OverlayDisplay(adb);
}

export async function readOverlayDisplays(adb: Adb): Promise<OverlayDisplayDevice[]> {
  return overlayDisplayService(adb).get();
}

export async function writeOverlayDisplays(adb: Adb, devices: readonly OverlayDisplayDevice[]): Promise<void> {
  await overlayDisplayService(adb).set(devices);
}
