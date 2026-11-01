import type { Adb } from '@yume-chan/adb';
import { t } from '@/lib/i18n';

export type PowerAction =
  | 'reboot'
  | 'bootloader'
  | 'fastboot'
  | 'recovery'
  | 'sideload'
  | 'edl'
  | 'power-off'
  | 'power-button'
  | 'power-button-long'
  | 'odin';

export async function powerAction(adb: Adb, action: PowerAction): Promise<string> {
  switch (action) {
    case 'reboot':
      return adb.power.reboot();
    case 'bootloader':
      return adb.power.bootloader();
    case 'fastboot':
      return adb.power.fastboot();
    case 'recovery':
      return adb.power.recovery();
    case 'sideload':
      return adb.power.sideload();
    case 'edl':
      return adb.power.qualcommEdlMode();
    case 'power-off':
      return adb.power.powerOff();
    case 'power-button':
      return adb.power.powerButton();
    case 'power-button-long':
      return adb.power.powerButton(true);
    case 'odin':
      return adb.power.samsungOdin();
    default:
      throw new Error(t('connection.powerService.unsupported'));
  }
}
