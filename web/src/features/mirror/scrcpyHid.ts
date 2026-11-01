// HID report descriptors and keyboard usage mapping for scrcpy's UHID input mode.
export const KEYBOARD_REPORT_DESCRIPTOR = new Uint8Array([
  0x05, 0x01, 0x09, 0x06, 0xa1, 0x01, 0x05, 0x07, 0x19, 0xe0, 0x29, 0xe7,
  0x15, 0x00, 0x25, 0x01, 0x75, 0x01, 0x95, 0x08, 0x81, 0x02, 0x95, 0x01,
  0x75, 0x08, 0x81, 0x01, 0x95, 0x05, 0x75, 0x01, 0x05, 0x08, 0x19, 0x01,
  0x29, 0x05, 0x91, 0x02, 0x95, 0x01, 0x75, 0x03, 0x91, 0x01, 0x95, 0x06,
  0x75, 0x08, 0x15, 0x00, 0x25, 0x65, 0x05, 0x07, 0x19, 0x00, 0x29, 0x65,
  0x81, 0x00, 0xc0,
]);

export const MOUSE_REPORT_DESCRIPTOR = new Uint8Array([
  0x05, 0x01, 0x09, 0x02, 0xa1, 0x01, 0x09, 0x01, 0xa1, 0x00, 0x05, 0x09,
  0x19, 0x01, 0x29, 0x03, 0x15, 0x00, 0x25, 0x01, 0x75, 0x01, 0x95, 0x03,
  0x81, 0x02, 0x75, 0x05, 0x95, 0x01, 0x81, 0x01, 0x05, 0x01, 0x09, 0x30,
  0x09, 0x31, 0x09, 0x38, 0x15, 0x81, 0x25, 0x7f, 0x75, 0x08, 0x95, 0x03,
  0x81, 0x06, 0xc0, 0xc0,
]);

export const HID_DEVICES = {
  keyboard: { id: 1, vendorId: 0x18d1, productId: 0x0001, name: 'NowWebAdb Keyboard' },
  mouse: { id: 2, vendorId: 0x18d1, productId: 0x0002, name: 'NowWebAdb Mouse' },
} as const;

export type HidDevice = keyof typeof HID_DEVICES;

const NAMED_USAGES: Record<string, number> = {
  Escape: 0x29, Backquote: 0x35, Minus: 0x2d, Equal: 0x2e, Backspace: 0x2a,
  Tab: 0x2b, BracketLeft: 0x2f, BracketRight: 0x30, Backslash: 0x31,
  Semicolon: 0x33, Quote: 0x34, Enter: 0x28, Comma: 0x36, Period: 0x37,
  Slash: 0x38, Space: 0x2c, CapsLock: 0x39, PrintScreen: 0x46,
  ScrollLock: 0x47, Pause: 0x48, Insert: 0x49, Home: 0x4a, PageUp: 0x4b,
  Delete: 0x4c, End: 0x4d, PageDown: 0x4e, ArrowRight: 0x4f, ArrowLeft: 0x50,
  ArrowDown: 0x51, ArrowUp: 0x52, NumLock: 0x53, NumpadDivide: 0x54,
  NumpadMultiply: 0x55, NumpadSubtract: 0x56, NumpadAdd: 0x57,
  NumpadEnter: 0x58, NumpadDecimal: 0x63, IntlBackslash: 0x64, ContextMenu: 0x65,
  NumpadEqual: 0x67, IntlRo: 0x87, IntlYen: 0x89, KanaMode: 0x88,
  Convert: 0x8a, NonConvert: 0x8b, Lang1: 0x90, Lang2: 0x91,
};

/** Maps a `KeyboardEvent.code` to a USB HID keyboard usage id. */
export function hidKeyUsage(code: string): number | undefined {
  if (code.length === 4 && code.startsWith('Key') && code >= 'KeyA' && code <= 'KeyZ') {
    return 0x04 + code.charCodeAt(3) - 65;
  }
  if (code.length === 6 && code.startsWith('Digit')) {
    const digit = code.charCodeAt(5) - 48;
    return digit === 0 ? 0x27 : 0x1e + digit - 1;
  }
  if (code.length === 7 && code.startsWith('Numpad')) {
    const digit = code.charCodeAt(6) - 48;
    if (digit >= 0 && digit <= 9) return digit === 0 ? 0x62 : 0x58 + digit;
  }
  const fKey = /^F(\d{1,2})$/.exec(code);
  if (fKey) {
    const index = Number(fKey[1]);
    if (index >= 1 && index <= 12) return 0x39 + index;
    if (index >= 13 && index <= 24) return 0x67 + index - 12;
  }
  return NAMED_USAGES[code];
}

/** USB HID boot keyboard modifier bits derived from a KeyboardEvent. */
export function hidModifiers(event: Pick<KeyboardEvent, 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>): number {
  let bits = 0;
  if (event.ctrlKey) bits |= 0x01;
  if (event.shiftKey) bits |= 0x02;
  if (event.altKey) bits |= 0x04;
  if (event.metaKey) bits |= 0x08;
  return bits;
}

/** Builds an 8-byte boot keyboard report for the given held usages. */
export function keyboardReport(modifiers: number, usages: Iterable<number>): Uint8Array {
  const report = new Uint8Array(8);
  report[0] = modifiers;
  let slot = 2;
  for (const usage of usages) {
    if (slot >= 8) break;
    report[slot] = usage;
    slot += 1;
  }
  return report;
}

export function mouseReport(buttons: number, dx: number, dy: number, wheel: number): Uint8Array {
  const clamp = (value: number) => Math.max(-127, Math.min(127, Math.round(value)));
  return new Uint8Array([buttons & 0x07, clamp(dx) & 0xff, clamp(dy) & 0xff, clamp(wheel) & 0xff]);
}

export function mouseButtonMask(button: number): number {
  if (button === 0) return 0x01;
  if (button === 1) return 0x04;
  if (button === 2) return 0x02;
  return 0;
}

const MODIFIER_CODES = new Set([
  'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight',
  'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight',
]);

/** Tracks held keys and produces boot keyboard reports for UHID input. */
export class HidKeyboardState {
  private readonly held = new Set<string>();

  reset(): void {
    this.held.clear();
  }

  down(event: KeyboardEvent): Uint8Array | undefined {
    const modifier = MODIFIER_CODES.has(event.code);
    if (!modifier && hidKeyUsage(event.code) === undefined) return undefined;
    if (event.repeat) return undefined;
    if (!modifier) this.held.add(event.code);
    return this.report(event);
  }

  up(event: KeyboardEvent): Uint8Array | undefined {
    const known = this.held.delete(event.code) || MODIFIER_CODES.has(event.code);
    if (!known) return undefined;
    return this.report(event);
  }

  release(): Uint8Array {
    this.held.clear();
    return keyboardReport(0, []);
  }

  private report(event: KeyboardEvent): Uint8Array {
    const usages: number[] = [];
    for (const code of this.held) {
      const usage = hidKeyUsage(code);
      if (usage !== undefined) usages.push(usage);
    }
    return keyboardReport(hidModifiers(event), usages);
  }
}

/** Converts a pixel-ish wheel delta into relative HID wheel ticks. */
export function wheelTicks(delta: number, deltaMode: number): number {
  const unit = deltaMode === 1 ? 16 : deltaMode === 2 ? 300 : 1;
  return Math.max(-127, Math.min(127, Math.round((-delta * unit) / 100)));
}
