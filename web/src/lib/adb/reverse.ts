import {
  AdbReverseNotSupportedError,
  AdbReverseService,
  type AdbForwardListener,
  type AdbIncomingSocketHandler,
} from '@yume-chan/adb';
import type { Adb } from '@yume-chan/adb';

export { AdbReverseNotSupportedError };
export type { AdbForwardListener, AdbIncomingSocketHandler };

export function reverseService(adb: Adb): AdbReverseService {
  return adb.reverse;
}

export async function listReverseTunnels(adb: Adb): Promise<AdbForwardListener[]> {
  return adb.reverse.list();
}

export async function addReverseTunnel(
  adb: Adb,
  deviceAddress: string,
  handler: AdbIncomingSocketHandler,
  localAddress?: string,
): Promise<string> {
  return adb.reverse.add(deviceAddress, handler, localAddress);
}

export async function addExternalReverse(adb: Adb, deviceAddress: string, localAddress: string): Promise<string> {
  return adb.reverse.addExternal(deviceAddress, localAddress);
}

export async function removeReverseTunnel(adb: Adb, deviceAddress: string): Promise<void> {
  await adb.reverse.remove(deviceAddress);
}

export async function removeAllReverseTunnels(adb: Adb): Promise<void> {
  await adb.reverse.removeAll();
}
