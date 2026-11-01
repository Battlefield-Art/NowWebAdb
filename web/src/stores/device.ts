import type { Adb, AdbServerClient } from '@yume-chan/adb';
import { create } from 'zustand';
import { readDeviceSnapshot, type DeviceSnapshot } from '@/lib/adb/deviceInfo';
import type { ConnectionKind, DeviceConnection } from '@/lib/adb/types';
import { t } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';

export type DeviceStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface DeviceState {
  adb: Adb | null;
  kind: ConnectionKind | null;
  server: AdbServerClient | null;
  serial: string;
  status: DeviceStatus;
  error: string;
  snapshot: DeviceSnapshot | null;
  snapshotLoading: boolean;
  snapshotError: string;
  connect: (connection: DeviceConnection) => void;
  disconnect: () => Promise<void>;
  setConnecting: () => void;
  /** Stop reacting to the current transport's disconnect without clearing the session. */
  holdConnection: () => void;
  setError: (message: string) => void;
  refreshSnapshot: (signal?: AbortSignal) => Promise<void>;
  reset: () => void;
}

let session = 0;
let releaseConnection: DeviceConnection['release'];

const initialState = {
  adb: null,
  kind: null as ConnectionKind | null,
  server: null as AdbServerClient | null,
  serial: '',
  status: 'idle' as DeviceStatus,
  error: '',
  snapshot: null,
  snapshotLoading: false,
  snapshotError: '',
};

export const useDeviceStore = create<DeviceState>((set, get) => ({
  ...initialState,

  connect(connection) {
    session += 1;
    const token = session;
    releaseConnection = connection.release;
    set({
      ...initialState,
      adb: connection.adb,
      kind: connection.kind,
      server: connection.server ?? null,
      serial: connection.adb.serial,
      status: 'connected',
    });
    const disconnected = (error?: unknown): void => {
      if (session !== token) return;
      releaseConnection = undefined;
      set({
        ...initialState,
        status: 'error',
        error: error ? toErrorMessage(error) : t('common.device.disconnected'),
      });
      void connection.release?.();
    };
    connection.adb.disconnected.then(() => disconnected(), disconnected);
  },

  async disconnect() {
    session += 1;
    const { adb } = get();
    const release = releaseConnection;
    releaseConnection = undefined;
    set({ ...initialState });
    try {
      await adb?.close();
    } finally {
      await release?.();
    }
  },

  setConnecting() {
    session += 1;
    set({ ...initialState, status: 'connecting' });
  },

  holdConnection() {
    session += 1;
  },

  setError(message) {
    set({ status: 'error', error: message });
  },

  async refreshSnapshot(signal) {
    const { adb } = get();
    if (!adb) return;
    const token = session;
    set({ snapshotLoading: true, snapshotError: '' });
    try {
      const snapshot = await readDeviceSnapshot(adb, { signal });
      if (session === token) set({ snapshot, snapshotLoading: false });
    } catch (error) {
      if (session === token) {
        set({ snapshotLoading: false, snapshotError: toErrorMessage(error) });
      }
    }
  },

  reset() {
    session += 1;
    releaseConnection = undefined;
    set({ ...initialState });
  },
}));

export const selectAdb = (state: DeviceState): Adb | null => state.adb;
export const selectConnected = (state: DeviceState): boolean => state.status === 'connected' && state.adb !== null;
