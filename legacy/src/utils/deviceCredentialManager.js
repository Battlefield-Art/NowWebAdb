import AdbWebCredentialStore from '@yume-chan/adb-credential-web';

export class DeviceCredentialManager {
    constructor() {
        this.credentialStore = new AdbWebCredentialStore('NowWebAdb');
    }

    async saveDeviceInfo(device) {
        const devices = this.getStoredDeviceInfos();
        devices[device.serial] = {
            name: device.name,
            serial: device.serial,
            vendorId: device.raw?.vendorId,
            productId: device.raw?.productId,
            lastConnected: new Date().toISOString(),
        };
        localStorage.setItem('adb_device_infos', JSON.stringify(devices));
    }

    getStoredDeviceInfos() {
        try { return JSON.parse(localStorage.getItem('adb_device_infos') || '{}'); }
        catch { return {}; }
    }

    async hasStoredKeys() {
        for await (const _key of this.credentialStore.iterateKeys()) return true;
        return false;
    }

    async getStoredKeyCount() {
        let count = 0;
        for await (const _key of this.credentialStore.iterateKeys()) count++;
        return count;
    }

    async clearAllCredentials() {
        const count = await this.getStoredKeyCount();
        await new Promise((resolve, reject) => {
            // @yume-chan/adb-credential-web 2.1.0 uses this shared origin-local store.
            const request = indexedDB.open('Tango', 1);
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error('凭证存储被其他标签页占用，请关闭后重试'));
            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('Authentication')) { db.close(); resolve(); return; }
                const transaction = db.transaction('Authentication', 'readwrite');
                transaction.objectStore('Authentication').clear();
                transaction.oncomplete = () => { db.close(); resolve(); };
                transaction.onabort = transaction.onerror = () => { db.close(); reject(transaction.error || new Error('清除凭证失败')); };
            };
        });
        localStorage.removeItem('adb_device_infos');
        return count;
    }

    getCredentialStore() { return this.credentialStore; }
}

export const deviceCredentialManager = new DeviceCredentialManager();
