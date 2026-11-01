import type { ScrcpyControlMessageWriter } from '@yume-chan/scrcpy';
import type { ScrcpySettings } from '@/lib/adb/scrcpySettings';
import {
  HID_DEVICES,
  KEYBOARD_REPORT_DESCRIPTOR,
  MOUSE_REPORT_DESCRIPTOR,
  type HidDevice,
} from './scrcpyHid';

export interface UhidPorts {
  run: (action: (controller: ScrcpyControlMessageWriter) => Promise<void>) => Promise<boolean>;
  settings: ScrcpySettings;
}

/** Tracks the UHID keyboard/mouse devices scrcpy should have open for the current settings. */
export class UhidDevices {
  private ready: Record<HidDevice, boolean> = { keyboard: false, mouse: false };

  constructor(private readonly ports: UhidPorts) {}

  async open(): Promise<void> {
    const { settings, run } = this.ports;
    if (settings.keyboardMode === 'uhid') {
      this.ready.keyboard = await this.create('keyboard', KEYBOARD_REPORT_DESCRIPTOR, run);
    }
    if (settings.mouseMode === 'uhid') {
      this.ready.mouse = await this.create('mouse', MOUSE_REPORT_DESCRIPTOR, run);
    }
  }

  isReady(device: HidDevice): boolean {
    return this.ready[device];
  }

  /** Ids of the devices that are currently open, so the session can destroy them on close. */
  openIds(): number[] {
    const ids = [
      this.ready.keyboard ? HID_DEVICES.keyboard.id : 0,
      this.ready.mouse ? HID_DEVICES.mouse.id : 0,
    ];
    return ids.filter(id => id !== 0);
  }

  private create(
    device: HidDevice,
    descriptor: Uint8Array,
    run: UhidPorts['run'],
  ): Promise<boolean> {
    const hid = HID_DEVICES[device];
    return run(controller => controller.uHidCreate({
      id: hid.id,
      vendorId: hid.vendorId,
      productId: hid.productId,
      name: hid.name,
      data: descriptor,
    }));
  }
}
