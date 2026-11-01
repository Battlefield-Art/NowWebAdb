import { describeUsbError, isUsbBusyError, usbBusyMessage } from '@/lib/connection/usb';

describe('USB connection errors', () => {
  it('recognizes the WebUSB exclusive-access error from yume-chan', () => {
    const busy = new Error('The device is already in used by another program');
    expect(isUsbBusyError(busy)).toBe(true);
    expect(describeUsbError(busy)).toBe(usbBusyMessage());
  });

  it('recognizes claim-interface failures and keeps cancel messages', () => {
    const claim = new DOMException('Unable to claim interface', 'NetworkError');
    expect(describeUsbError(claim)).toBe(usbBusyMessage());
    const cancelled = new DOMException('No device selected.', 'NotFoundError');
    expect(describeUsbError(cancelled)).toContain('重新授权');
  });
});
