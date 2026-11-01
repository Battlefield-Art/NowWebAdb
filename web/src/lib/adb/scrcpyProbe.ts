import type { Adb } from '@yume-chan/adb';
import { AdbScrcpyClient, AdbScrcpyExitedError, AdbScrcpyOptions3_3_3 } from '@yume-chan/adb-scrcpy';
import { DefaultServerPath, type ScrcpyDisplay, type ScrcpyEncoder } from '@yume-chan/scrcpy';
import { throwIfAborted } from './async';
import { createScrcpySpawner, pushScrcpyServer } from './scrcpy';
import type { ScrcpyCameraFacing } from './scrcpySettings';

function probeOptions(adb: Adb, signal?: AbortSignal) {
  return new AdbScrcpyOptions3_3_3({ tunnelForward: true }, { spawner: createScrcpySpawner(adb, signal) });
}

export async function listScrcpyDisplays(adb: Adb, signal?: AbortSignal): Promise<ScrcpyDisplay[]> {
  throwIfAborted(signal);
  await pushScrcpyServer(adb, signal);
  throwIfAborted(signal);
  return AdbScrcpyClient.getDisplays(adb, DefaultServerPath, probeOptions(adb, signal));
}

export async function listScrcpyEncoders(adb: Adb, signal?: AbortSignal): Promise<ScrcpyEncoder[]> {
  throwIfAborted(signal);
  await pushScrcpyServer(adb, signal);
  throwIfAborted(signal);
  return AdbScrcpyClient.getEncoders(adb, DefaultServerPath, probeOptions(adb, signal));
}

export interface ScrcpyCamera {
  id: string;
  facing?: ScrcpyCameraFacing;
  sizes: string[];
}

const FACINGS: readonly ScrcpyCameraFacing[] = ['front', 'back', 'external'];
const PAIR = /--([\w-]+)=(\S+)/g;
const SIZE = /^\d{2,5}x\d{2,5}$/;

/** Parses `--camera-id=... --camera-facing=... --camera-size=...` output lines. */
export function parseCameraLines(lines: readonly string[]): ScrcpyCamera[] {
  const cameras = new Map<string, { facing?: ScrcpyCameraFacing; sizes: Set<string> }>();
  for (const line of lines) {
    const values: Record<string, string> = {};
    for (const match of line.matchAll(PAIR)) {
      const [, key, value] = match;
      if (key && value) values[key] = value;
    }
    const id = values['camera-id'];
    if (!id) continue;
    const camera = cameras.get(id) ?? { sizes: new Set<string>() };
    const facing = values['camera-facing'] as ScrcpyCameraFacing | undefined;
    if (facing && FACINGS.includes(facing)) camera.facing = facing;
    const size = values['camera-size'];
    if (size && SIZE.test(size)) camera.sizes.add(size);
    cameras.set(id, camera);
  }
  return [...cameras.entries()]
    .map(([id, camera]) => ({ id, facing: camera.facing, sizes: [...camera.sizes] }))
    .sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true }));
}

async function runListing(
  adb: Adb,
  init: { listCameras?: boolean; listCameraSizes?: boolean; cameraId?: string },
  signal?: AbortSignal,
): Promise<string[]> {
  throwIfAborted(signal);
  await pushScrcpyServer(adb, signal);
  const options = new AdbScrcpyOptions3_3_3(
    { tunnelForward: true, ...init },
    { spawner: createScrcpySpawner(adb, signal) },
  );
  try {
    const client = await AdbScrcpyClient.start(adb, DefaultServerPath, options);
    await client.close();
    return [];
  } catch (error) {
    if (error instanceof AdbScrcpyExitedError) {
      if (error.output[0]?.startsWith('[server] ERROR:')) throw error;
      return [...error.output];
    }
    throw error;
  }
}

export async function listScrcpyCameras(adb: Adb, signal?: AbortSignal): Promise<ScrcpyCamera[]> {
  return parseCameraLines(await runListing(adb, { listCameras: true }, signal));
}

export async function listScrcpyCameraSizes(
  adb: Adb,
  cameraId: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const lines = await runListing(adb, { listCameraSizes: true, cameraId: cameraId || undefined }, signal);
  const cameras = parseCameraLines(lines);
  const selected = cameraId ? cameras.find(camera => camera.id === cameraId) : undefined;
  const sizes = new Set(selected?.sizes ?? cameras.flatMap(camera => camera.sizes));
  if (!sizes.size) {
    for (const line of lines) {
      for (const match of line.matchAll(/--camera-size=(\S+)/g)) {
        if (match[1]) sizes.add(match[1]);
      }
    }
  }
  return [...sizes];
}
