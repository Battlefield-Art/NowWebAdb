import {
  AndroidKeyEventAction,
  AndroidScreenPowerMode,
  type AndroidKeyCode,
  type AndroidKeyEventMeta,
  type ScrcpyControlMessageWriter,
} from '@yume-chan/scrcpy';
import { HID_DEVICES, mouseReport, type HidDevice } from './scrcpyHid';
import type { ScrollMessage, TouchMessage } from './scrcpyMessages';

export interface ScrcpyControlPorts {
  run: (action: (controller: ScrcpyControlMessageWriter) => Promise<void>) => Promise<boolean>;
  videoSize: () => readonly [number, number];
  hidReady: (device: HidDevice) => boolean;
}

/** Every scrcpy control message the mirror can send, decoupled from session lifecycle. */
export class ScrcpyControls {
  constructor(private readonly ports: ScrcpyControlPorts) {}

  pressKey(keyCode: number): Promise<boolean> {
    const down = this.keyEvent(keyCode, AndroidKeyEventAction.Down, 0, 0);
    return down.then(result => result && this.keyEvent(keyCode, AndroidKeyEventAction.Up, 0, 0));
  }

  keyEvent(
    keyCode: number,
    action: AndroidKeyEventAction,
    metaState: number,
    repeat: number,
  ): Promise<boolean> {
    return this.ports.run(controller =>
      controller.injectKeyCode({
        action,
        keyCode: keyCode as AndroidKeyCode,
        metaState: metaState as AndroidKeyEventMeta,
        repeat,
      }),
    );
  }

  sendText(text: string): Promise<boolean> {
    return this.ports.run(controller => controller.injectText(text));
  }

  hidKeyboard(report: Uint8Array): Promise<boolean> {
    if (!this.ports.hidReady('keyboard')) return Promise.resolve(false);
    return this.ports.run(controller =>
      controller.uHidInput({ id: HID_DEVICES.keyboard.id, data: report }),
    );
  }

  hidMouse(buttons: number, dx: number, dy: number, wheel = 0): Promise<boolean> {
    if (!this.ports.hidReady('mouse')) return Promise.resolve(false);
    const report = mouseReport(buttons, dx, dy, wheel);
    return this.ports.run(controller => controller.uHidInput({ id: HID_DEVICES.mouse.id, data: report }));
  }

  startApp(name: string): Promise<boolean> {
    return this.ports.run(controller => controller.startApp(name));
  }

  touch({ action, pointerId, x, y, pressure }: TouchMessage): Promise<boolean> {
    const [videoWidth, videoHeight] = this.ports.videoSize();
    return this.ports.run(controller =>
      controller.injectTouch({
        action,
        pointerId: BigInt(pointerId),
        pointerX: x,
        pointerY: y,
        videoWidth,
        videoHeight,
        pressure,
        actionButton: 0,
        buttons: 0,
      }),
    );
  }

  scroll({ x, y, scrollX, scrollY }: ScrollMessage): Promise<boolean> {
    const [videoWidth, videoHeight] = this.ports.videoSize();
    return this.ports.run(controller =>
      controller.injectScroll({
        pointerX: x,
        pointerY: y,
        videoWidth,
        videoHeight,
        scrollX,
        scrollY,
        buttons: 0,
      }),
    );
  }

  setClipboard(content: string): Promise<boolean> {
    if (!content) return Promise.resolve(false);
    return this.ports.run(controller => controller.setClipboard({ content, paste: true, sequence: 0n }));
  }

  rotate(): Promise<boolean> {
    return this.ports.run(controller => controller.rotateDevice());
  }

  expandNotifications(): Promise<boolean> {
    return this.ports.run(controller => controller.expandNotificationPanel());
  }

  setScreenPower(on: boolean): Promise<boolean> {
    const mode = on ? AndroidScreenPowerMode.Normal : AndroidScreenPowerMode.Off;
    return this.ports.run(controller => controller.setScreenPowerMode(mode));
  }
}
