import { Adb, AdbDaemonTransport, type AdbCredentialStore } from '@yume-chan/adb';
import { AdbDaemonWebUsbDevice, AdbDaemonWebUsbDeviceManager } from '@yume-chan/adb-daemon-webusb';
import { t } from '@/lib/i18n';

export type { AdbDaemonWebUsbDevice };

export const usbManager = AdbDaemonWebUsbDeviceManager.BROWSER;
export const usbSupported = Boolean(usbManager);

export async function listUsbDevices(): Promise<AdbDaemonWebUsbDevice[]> {
  if (!usbManager) return [];
  try {
    return await usbManager.getDevices();
  } catch {
    return [];
  }
}

export async function requestUsbDevice(): Promise<AdbDaemonWebUsbDevice | undefined> {
  if (!usbManager) throw new Error(t('home.usb.unsupportedError'));
  return usbManager.requestDevice();
}

export async function openUsbDevice(
  device: AdbDaemonWebUsbDevice,
  credentialStore: AdbCredentialStore,
  signal?: AbortSignal,
): Promise<Adb> {
  const closeRaw = () => device.raw.close().catch(() => undefined);
  const onAbort = () => void closeRaw();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    if (signal?.aborted) throw signal.reason ?? new DOMException(t('files.error.cancelled'), 'AbortError');
    const connection = await device.connect();
    const transport = await AdbDaemonTransport.authenticate({
      serial: device.serial,
      connection,
      credentialStore,
    });
    return new Adb(transport);
  } catch (error) {
    await closeRaw();
    throw new Error(describeUsbError(error), { cause: error });
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}

export function usbBusyMessage(): string {
  return t('home.usb.busy');
}

function errorText(error: unknown): { name: string; message: string } {
  if (typeof error === 'object' && error !== null) {
    const { name, message } = error as { name?: unknown; message?: unknown };
    return {
      name: typeof name === 'string' ? name : '',
      message: typeof message === 'string' ? message : String(error),
    };
  }
  return { name: '', message: String(error) };
}

export function isUsbBusyError(error: unknown): boolean {
  if (error instanceof AdbDaemonWebUsbDevice.DeviceBusyError) return true;
  const { name, message } = errorText(error);
  return name === 'NetworkError' || /already in us|claim interface|device.{0,12}busy|占用/i.test(message);
}

export function describeUsbError(error: unknown): string {
  if (isUsbBusyError(error)) return usbBusyMessage();
  const { name, message } = errorText(error);
  if (name === 'NotFoundError' || name === 'SecurityError') {
    return t('home.usb.denied');
  }
  return message;
}

export function watchUsbDevices(onChange: () => void): () => void {
  const usb = navigator.usb as USB | undefined;
  if (!usb) return () => {};
  usb.addEventListener('connect', onChange);
  usb.addEventListener('disconnect', onChange);
  return () => {
    usb.removeEventListener('connect', onChange);
    usb.removeEventListener('disconnect', onChange);
  };
}
