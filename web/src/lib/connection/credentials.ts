import type { AdbCredentialStore } from '@yume-chan/adb';
import AdbWebCredentialStore from '@yume-chan/adb-credential-web';
import type { AdbDaemonWebUsbDevice } from '@/lib/connection/usb';
import { t } from '@/lib/i18n';

const DEVICE_INFOS_KEY = 'adb_device_infos';
const CREDENTIAL_DB = 'Tango';
const CREDENTIAL_STORE = 'Authentication';

export interface StoredDevice {
  name: string;
  serial: string;
  vendorId?: number | undefined;
  productId?: number | undefined;
  lastConnected: string;
}

function openCredentialDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CREDENTIAL_DB, 1);
    request.onerror = () => reject(request.error ?? new Error(t('home.credentials.error.open')));
    request.onblocked = () => reject(new Error(t('home.credentials.error.blocked')));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CREDENTIAL_STORE)) {
        db.createObjectStore(CREDENTIAL_STORE, { autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function runStoreRequest<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openCredentialDatabase().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(CREDENTIAL_STORE, mode);
        const request = run(transaction.objectStore(CREDENTIAL_STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error(t('home.credentials.error.operation')));
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error(t('home.credentials.error.transaction')));
        };
        transaction.onabort = () => {
          db.close();
          reject(transaction.error ?? new Error(t('home.credentials.error.aborted')));
        };
      }),
  );
}

function clearCredentialDatabase(): Promise<void> {
  return runStoreRequest('readwrite', store => store.clear()).then(() => undefined);
}

export class DeviceCredentialManager {
  private readonly credentialStore = new AdbWebCredentialStore('NowWebAdb');

  getCredentialStore(): AdbCredentialStore {
    return this.credentialStore;
  }

  getStoredDeviceInfos(): Record<string, StoredDevice> {
    try {
      return JSON.parse(localStorage.getItem(DEVICE_INFOS_KEY) ?? '{}') as Record<string, StoredDevice>;
    } catch {
      return {};
    }
  }

  saveDeviceInfo(device: AdbDaemonWebUsbDevice): void {
    const devices = this.getStoredDeviceInfos();
    devices[device.serial] = {
      name: device.name,
      serial: device.serial,
      vendorId: device.raw.vendorId,
      productId: device.raw.productId,
      lastConnected: new Date().toISOString(),
    };
    localStorage.setItem(DEVICE_INFOS_KEY, JSON.stringify(devices));
  }

  async hasStoredKeys(): Promise<boolean> {
    for await (const key of this.credentialStore.iterateKeys()) {
      void key;
      return true;
    }
    return false;
  }

  async getStoredKeyCount(): Promise<number> {
    let count = 0;
    for await (const key of this.credentialStore.iterateKeys()) {
      void key;
      count += 1;
    }
    return count;
  }

  async clearAllCredentials(): Promise<number> {
    const count = await this.getStoredKeyCount();
    await clearCredentialDatabase();
    localStorage.removeItem(DEVICE_INFOS_KEY);
    return count;
  }
}

/** Stored RSA private keys (PKCS#8 DER) in insertion order. */
export async function listStoredKeys(): Promise<Uint8Array[]> {
  const items = await runStoreRequest<unknown[]>('readonly', store => store.getAll() as IDBRequest<unknown[]>);
  return items.filter((item): item is Uint8Array => item instanceof Uint8Array);
}

export async function addStoredKey(privateKey: Uint8Array): Promise<void> {
  await runStoreRequest('readwrite', store => store.add(privateKey));
}

export const deviceCredentialManager = new DeviceCredentialManager();
