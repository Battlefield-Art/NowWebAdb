import { LinuxFileType, type AdbSync, type AdbSyncEntry } from '@yume-chan/adb';
import type { Adb } from '@yume-chan/adb';
import { readBytes, throwIfAborted } from './async';
import { normalizeRemotePath, remoteBaseName } from './paths';
import { execText } from './shell';
import type { ShellOptions } from './types';

export { LinuxFileType };

export interface RemoteFile {
  name: string;
  path: string;
  size: number;
  mtime: Date;
  isDirectory: boolean;
  isLink: boolean;
  permission: number;
  mode?: number;
  uid?: number;
  gid?: number;
  atime?: Date;
  ctime?: Date;
  nlink?: number;
}

function joinPath(base: string, name: string): string {
  return base.endsWith('/') ? `${base}${name}` : `${base}/${name}`;
}

function toDate(seconds: bigint | number): Date {
  return new Date(Number(seconds) * 1000);
}

function toRemoteFile(
  entry: AdbSyncEntry & { nlink?: number },
  parent: string,
): RemoteFile {
  return {
    name: entry.name,
    path: joinPath(parent, entry.name),
    size: Number(entry.size),
    mtime: toDate(entry.mtime),
    isDirectory: entry.type === LinuxFileType.Directory,
    isLink: entry.type === LinuxFileType.Link,
    permission: entry.permission,
    mode: entry.mode,
    ...(entry.uid === undefined ? {} : { uid: entry.uid }),
    ...(entry.gid === undefined ? {} : { gid: entry.gid }),
    ...(entry.atime === undefined ? {} : { atime: toDate(entry.atime) }),
    ...(entry.ctime === undefined ? {} : { ctime: toDate(entry.ctime) }),
    ...(entry.nlink === undefined ? {} : { nlink: entry.nlink }),
  };
}

const TYPE_CHARACTERS: ReadonlyArray<readonly [number, string]> = [
  [0o040000, 'd'],
  [0o100000, '-'],
  [0o120000, 'l'],
  [0o020000, 'c'],
  [0o060000, 'b'],
  [0o010000, 'p'],
  [0o140000, 's'],
];

function executeCharacter(bit: number, special: boolean, marker: string): string {
  if (special) return bit ? marker : marker.toUpperCase();
  return bit ? 'x' : '-';
}

/** Formats a raw Unix mode (e.g. `33188`) as `-rw-r--r--`. */
export function formatMode(mode: number): string {
  const type = mode & 0o170000;
  const typeCharacter = TYPE_CHARACTERS.find(([bits]) => bits === type)?.[1] ?? '?';
  const bits = mode & 0o7777;
  const triplet = (shift: number, special: boolean, marker: string): string => {
    const part = (bits >> shift) & 7;
    return `${part & 4 ? 'r' : '-'}${part & 2 ? 'w' : '-'}${executeCharacter(part & 1, special, marker)}`;
  };
  return (
    typeCharacter +
    triplet(6, Boolean(bits & 0o4000), 's') +
    triplet(3, Boolean(bits & 0o2000), 's') +
    triplet(0, Boolean(bits & 0o1000), 't')
  );
}

/** Formats the permission bits (without the file type) as an octal string. */
export function formatOctal(permission: number): string {
  return (permission & 0o7777).toString(8).padStart(4, '0');
}

export async function withSync<T>(adb: Adb, task: (sync: AdbSync) => Promise<T>, signal?: AbortSignal): Promise<T> {
  throwIfAborted(signal);
  const sync = await adb.sync();
  let disposal: Promise<void> | undefined;
  const dispose = (): Promise<void> => (disposal ??= Promise.resolve().then(() => sync.dispose()));
  const abort = (): void => {
    void dispose().catch(() => {});
  };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    return await task(sync);
  } finally {
    signal?.removeEventListener('abort', abort);
    await dispose();
  }
}

export async function listDirectory(adb: Adb, path: string, options: ShellOptions = {}): Promise<RemoteFile[]> {
  const entries = await withSync(adb, sync => sync.readdir(path), options.signal);
  return entries
    .filter(entry => entry.name !== '.' && entry.name !== '..')
    .map(entry => toRemoteFile(entry, path))
    .sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name));
}

export async function statPath(adb: Adb, path: string, options: ShellOptions = {}): Promise<RemoteFile> {
  const entry = await withSync(
    adb,
    sync => (sync.supportsStat ? sync.stat(path) : sync.lstat(path)),
    options.signal,
  );
  return {
    name: remoteBaseName(path),
    path: normalizeRemotePath(path),
    size: Number(entry.size),
    mtime: toDate(entry.mtime),
    isDirectory: entry.type === LinuxFileType.Directory,
    isLink: entry.type === LinuxFileType.Link,
    permission: entry.permission,
    mode: entry.mode,
    ...(entry.uid === undefined ? {} : { uid: entry.uid }),
    ...(entry.gid === undefined ? {} : { gid: entry.gid }),
    ...(entry.atime === undefined ? {} : { atime: toDate(entry.atime) }),
    ...(entry.ctime === undefined ? {} : { ctime: toDate(entry.ctime) }),
    ...('nlink' in entry && typeof entry.nlink === 'number' ? { nlink: entry.nlink } : {}),
  };
}

export async function readFile(
  adb: Adb,
  path: string,
  options: ShellOptions & { maxBytes?: number } = {},
): Promise<Uint8Array> {
  const maxBytes = options.maxBytes ?? 64 * 1024 * 1024;
  return withSync(adb, sync => readBytes(sync.read(path), maxBytes, options.signal), options.signal);
}

export async function readFileText(adb: Adb, path: string, options?: ShellOptions): Promise<string> {
  return new TextDecoder().decode(await readFile(adb, path, options));
}

export async function createDirectory(adb: Adb, path: string, options?: ShellOptions): Promise<void> {
  await execText(adb, ['mkdir', '-p', path], { timeout: 10000, ...options });
}

export async function removePath(adb: Adb, path: string, options: { recursive?: boolean; signal?: AbortSignal } = {}): Promise<void> {
  await adb.rm(path, { recursive: options.recursive, force: true });
}

export async function renamePath(adb: Adb, from: string, to: string, options?: ShellOptions): Promise<void> {
  await execText(adb, ['mv', '-f', from, to], { timeout: 15000, ...options });
}
