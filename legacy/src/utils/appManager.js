import { PackageManager } from '@yume-chan/android-bin';
import { ReadableStream } from '@yume-chan/stream-extra';
import { aborted, bounded, runAppCommand, shellEscape } from './adbShell.js';
import { extractAppInfo } from './apk/apkInfo.js';

export { runAppCommand, shellEscape };

export function validatePackageName(value) {
    if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(value)) {
        throw new Error('无效的应用包名');
    }
    return value;
}

export function validateApkPath(value) {
    if (typeof value !== 'string' || !value.startsWith('/') || !/\.apk$/i.test(value) ||
        /[\x00-\x1f\x7f]/.test(value) || value.split('/').some(part => part === '..' || part === '.')) {
        throw new Error('无效的 APK 路径');
    }
    return value;
}


// This listing deliberately does not depend on the metadata server or invoke aapt per app.
// Consumers may use packageName/appName/sourceDir/versionCode/installer/uid immediately.
export async function listInstalledApps(adb, { scope = 'all', enabled = 'all', signal, packageManager } = {}) {
    const pm = packageManager || new PackageManager(adb);
    const options = { showSourceDir: true, showVersionCode: true, showInstaller: true, showUid: true };
    if (scope === 'thirdParty') options.listThirdParty = true;
    if (scope === 'system') options.listSystem = true;
    if (enabled === 'enabled') options.listEnabled = true;
    if (enabled === 'disabled') options.listDisabled = true;
    const apps = new Map();
    const add = app => {
        validatePackageName(app.packageName);
        apps.set(app.packageName, { ...app, appName: app.packageName, iconBase64: '', metadataLoaded: false });
    };
    try {
        for await (const app of pm.listPackages(options)) {
            aborted(signal);
            add(app);
        }
    } catch (error) {
        aborted(signal);
        if (packageManager) throw error;
        // Older Android builds may reject the optional version/installer/UID flags.
        // Fall back to the generic listing, with checked exit status, not per-app aapt.
        apps.clear();
        const args = ['pm', 'list', 'packages', '-f'];
        if (scope === 'thirdParty') args.push('-3');
        if (scope === 'system') args.push('-s');
        if (enabled === 'enabled') args.push('-e');
        if (enabled === 'disabled') args.push('-d');
        const output = await runAppCommand(adb, args, { signal });
        for (const line of output.split('\n').filter(line => line.trim())) {
            if (!line.startsWith('package:')) throw new Error(`无效的应用列表响应：${line}`);
            add(PackageManager.parsePackageListItem(line.trim()));
        }
    }
    aborted(signal);
    return [...apps.values()];
}

const clients = new WeakMap();
const metadataCaches = new WeakMap();
const METADATA_CONCURRENCY = 4;
const METADATA_CACHE_LIMIT = 500;

// Reads only the ZIP directory, manifest, resources and icon entries over ADB.
// Nothing is uploaded, started or installed on the device.
class ApkMetadataClient {
    constructor(adb, timeout, cache) {
        this.adb = adb;
        this.timeout = timeout;
        this.cache = cache;
        this.active = 0;
        this.waiting = [];
        this.closed = false;
    }
    async request(app, signal) {
        aborted(signal);
        const packageName = validatePackageName(app.packageName);
        const sourceDir = validateApkPath(app.sourceDir);
        const cacheKey = `${packageName}|${sourceDir}|${app.versionCode ?? ''}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;
        await this.acquire(signal);
        try {
            aborted(signal);
            if (this.closed) throw new Error('操作已取消');
            const queued = this.cache.get(cacheKey);
            if (queued) return queued;
            const info = await bounded(extractAppInfo(this.adb, { ...app, packageName, sourceDir }, {
                signal, timeout: this.timeout,
            }), this.timeout * 4, signal);
            aborted(signal);
            if (this.cache.size >= METADATA_CACHE_LIMIT) {
                const oldest = this.cache.keys().next().value;
                if (oldest !== undefined) this.cache.delete(oldest);
            }
            this.cache.set(cacheKey, info);
            return info;
        } finally { this.release(); }
    }
    acquire(signal) {
        if (this.active < METADATA_CONCURRENCY) { this.active++; return Promise.resolve(); }
        if (signal?.aborted) return Promise.reject(signal.reason || new Error('操作已取消'));
        return new Promise((resolve, reject) => {
            const waiter = {
                resolve: () => { signal?.removeEventListener('abort', abort); resolve(); },
                cancel: () => { signal?.removeEventListener('abort', abort); reject(signal?.reason || new Error('操作已取消')); },
            };
            const abort = () => {
                const index = this.waiting.indexOf(waiter);
                if (index >= 0) this.waiting.splice(index, 1);
                waiter.cancel();
            };
            signal?.addEventListener('abort', abort, { once: true });
            this.waiting.push(waiter);
        });
    }
    release() {
        const next = this.waiting.shift();
        if (next) next.resolve(); else this.active--;
    }
    close() {
        this.closed = true;
        for (const waiter of this.waiting.splice(0)) waiter.cancel();
    }
}

export async function acquireAppMetadata(adb, { timeout = 30000, signal } = {}) {
    aborted(signal);
    let entry = clients.get(adb);
    if (!entry || entry.client.closed) {
        let cache = metadataCaches.get(adb);
        if (!cache) { cache = new Map(); metadataCaches.set(adb, cache); }
        entry = { client: new ApkMetadataClient(adb, timeout, cache), refs: 0 };
        clients.set(adb, entry);
    }
    entry.refs++;
    let released = false;
    const release = async () => {
        if (released) return;
        released = true;
        signal?.removeEventListener('abort', onAbort);
        if (--entry.refs === 0) {
            if (clients.get(adb) === entry) clients.delete(adb);
            entry.client.close();
        }
    };
    const onAbort = () => { void release(); };
    signal?.addEventListener('abort', onAbort, { once: true });
    return { request: (app, requestSignal = signal) => entry.client.request(app, requestSignal), release };
}

export async function installApks(adb, files, { signal, onProgress = () => {}, packageManager } = {}) {
    const selected = Array.from(files);
    if (!selected.length || selected.some(file => !/\.apk$/i.test(file.name) || !Number.isSafeInteger(file.size) || file.size <= 0 || typeof file.stream !== 'function')) {
        throw new Error('请选择非空 APK 文件；所有文件必须是同一应用的 base + splits');
    }
    aborted(signal);
    const pm = packageManager || new PackageManager(adb);
    let session;
    let committed = false;
    const total = selected.reduce((sum, file) => sum + file.size, 0);
    let loaded = 0;
    try {
        session = await pm.sessionCreate();
        for (let index = 0; index < selected.length; index++) {
            aborted(signal);
            const file = selected[index];
            const reader = file.stream().getReader();
            let ended = false;
            const stream = new ReadableStream({
                async pull(controller) {
                    try {
                        aborted(signal);
                        const { value, done } = await reader.read();
                        if (done) { ended = true; reader.releaseLock(); controller.close(); return; }
                        loaded += value.byteLength;
                        onProgress({ loaded, total, file: file.name, phase: '上传' });
                        controller.enqueue(value);
                    } catch (error) { controller.error(error); }
                },
                async cancel(reason) { if (!ended) await reader.cancel(reason); },
            });
            try {
                // Do not put an untrusted local filename into a package-manager command.
                await pm.sessionAddSplitStream(session, `part_${index}.apk`, file.size, stream);
            } finally {
                if (!ended) { await reader.cancel().catch(() => {}); try { reader.releaseLock(); } catch { /* cancelled */ } }
            }
        }
        aborted(signal);
        onProgress({ loaded: total, total, phase: '提交安装' });
        await pm.sessionCommit(session);
        committed = true;
        onProgress({ loaded: total, total, phase: '安装完成' });
    } catch (error) {
        if (session !== undefined && !committed) {
            try { await pm.sessionAbandon(session); }
            catch (cleanupError) { throw new Error(`${error.message}；清理安装会话 ${session} 失败：${cleanupError.message}`); }
        }
        throw error;
    }
    // Successful commit consumes the session; abandon only uncommitted sessions.
}

export async function uninstallApp(adb, packageName, { packageManager } = {}) {
    validatePackageName(packageName);
    await (packageManager || new PackageManager(adb)).uninstall(packageName, { keepData: false });
}

export async function performAppAction(adb, packageName, action, options) {
    validatePackageName(packageName);
    const commands = {
        launch: ['monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1'],
        stop: ['am', 'force-stop', packageName],
        enable: ['pm', 'enable', packageName],
        disable: ['pm', 'disable-user', packageName],
        details: ['dumpsys', 'package', packageName],
    };
    if (!commands[action]) throw new Error('不支持的应用操作');
    const output = await runAppCommand(adb, commands[action], options);
    if (action === 'enable' && !/new state:\s*enabled/.test(output)) throw new Error(output || '启用未确认');
    if (action === 'disable' && !/new state:\s*disabled-user/.test(output)) throw new Error(output || '停用未确认');
    if (action === 'launch' && !/Events injected:\s*[1-9]/.test(output)) throw new Error(output || '无法启动应用');
    return output;
}

export async function exportAppApks(adb, packageName, { signal, onProgress = () => {}, packageManager, zipModule } = {}) {
    validatePackageName(packageName);
    let sources;
    try { sources = await (packageManager || new PackageManager(adb)).getPackageSources(packageName); }
    catch (error) { if (packageManager) throw error; sources = []; }
    if (!sources.length && !packageManager) {
        // android-bin 2.1.0 uses `package -p` here; some devices require `pm path`.
        const output = await runAppCommand(adb, ['pm', 'path', packageName], { signal });
        sources = output.split('\n').filter(line => line.startsWith('package:')).map(line => line.slice(8).trim());
    }
    sources = [...new Set(sources)];
    if (!sources.length) throw new Error('未找到 APK 源文件');
    sources.forEach(validateApkPath);
    aborted(signal);
    const sync = await adb.sync();
    let zip;
    let zipClosed = false;
    let disposal;
    const dispose = () => (disposal ??= Promise.resolve().then(() => sync.dispose()));
    const abort = () => { void dispose().catch(() => {}); };
    signal?.addEventListener('abort', abort, { once: true });
    try {
        const blobs = [];
        let loaded = 0;
        for (let index = 0; index < sources.length; index++) {
            aborted(signal);
            const reader = sync.read(sources[index]).getReader();
            const chunks = [];
            try {
                for (;;) {
                    aborted(signal);
                    const { value, done } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                    loaded += value.byteLength;
                    onProgress({ loaded, file: sources[index], index: index + 1, count: sources.length });
                }
            } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
            const blob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });
            if (!blob.size) throw new Error(`APK 文件为空：${sources[index]}`);
            blobs.push(blob);
        }
        aborted(signal);
        if (blobs.length === 1) return { blob: blobs[0], filename: `${packageName}.apk` };
        const { ZipWriter, BlobWriter, BlobReader } = zipModule || await import('@zip.js/zip.js');
        zip = new ZipWriter(new BlobWriter('application/zip'));
        for (let index = 0; index < sources.length; index++) {
            aborted(signal);
            // Prefixes guarantee unique safe archive names, including on unusual devices.
            const basename = sources[index].split('/').pop().replace(/[^A-Za-z0-9_.-]/g, '_');
            await zip.add(`${index}_${basename}`, new BlobReader(blobs[index]), { level: 0, signal });
        }
        const blob = await zip.close();
        zipClosed = true;
        return { blob, filename: `${packageName}-apks.zip` };
    } finally {
        signal?.removeEventListener('abort', abort);
        try { if (zip && !zipClosed) await zip.close(); }
        finally { await dispose(); }
    }
}
