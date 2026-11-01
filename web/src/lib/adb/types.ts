import type { Adb, AdbServerClient } from '@yume-chan/adb';

export type ConnectionKind = 'usb' | 'server';

export interface DeviceConnection {
  readonly adb: Adb;
  readonly kind: ConnectionKind;
  /** Bridge client backing a `server` connection, used for wireless switching. */
  readonly server?: AdbServerClient;
  readonly release?: () => void | Promise<void>;
}

export interface ShellOptions {
  signal?: AbortSignal;
  timeout?: number;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface BinaryOptions extends ShellOptions {
  maxBytes?: number;
}

export interface ProgressEvent {
  loaded: number;
  total: number;
  phase: string;
  file?: string;
}

export type ProgressHandler = (event: ProgressEvent) => void;
