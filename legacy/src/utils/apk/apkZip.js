import { readRange, readTail } from '../adbShell.js';

const EOCD_SIGNATURE = 0x06054b50;
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50;
const ZIP64_EOCD_SIGNATURE = 0x06064b50;
const CD_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

function viewOf(bytes) {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function safeU64(view, offset, context) {
    const value = view.getBigUint64(offset, true);
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`${context}过大`);
    return Number(value);
}

export class RemoteApk {
    constructor(adb, path, { signal, timeout = 30000 } = {}) {
        this.adb = adb;
        this.path = path;
        this.signal = signal;
        this.timeout = timeout;
        this.directoryPromise = null;
        this.entries = new Map();
        this.inflated = new Map();
    }

    async directory() {
        if (!this.directoryPromise) {
            this.directoryPromise = this.loadDirectory().catch(error => {
                this.directoryPromise = null;
                throw error;
            });
        }
        return this.directoryPromise;
    }

    async loadDirectory() {
        const tail = await readTail(this.adb, this.path, 131072, { signal: this.signal, timeout: this.timeout });
        if (!tail.length) throw new Error('无法读取 APK');
        const tailView = viewOf(tail);
        let eocd = -1;
        for (let offset = tail.length - 22; offset >= 0; offset--) {
            if (tailView.getUint32(offset, true) === EOCD_SIGNATURE) { eocd = offset; break; }
        }
        if (eocd < 0) throw new Error('APK 目录结构无效');
        const commentLength = tailView.getUint16(eocd + 20, true);
        if (eocd + 22 + commentLength > tail.length) throw new Error('APK 目录注释越界');

        let cdOffset = tailView.getUint32(eocd + 16, true);
        let cdSize = tailView.getUint32(eocd + 12, true);
        let count = tailView.getUint16(eocd + 10, true);
        let zip64 = false;
        if (count === 0xffff || cdOffset === 0xffffffff || cdSize === 0xffffffff) {
            if (eocd < 20 || tailView.getUint32(eocd - 20, true) !== ZIP64_LOCATOR_SIGNATURE) {
                throw new Error('该 APK 的 ZIP64 目录不受支持');
            }
            const zip64Offset = safeU64(tailView, eocd - 12, 'ZIP64 目录');
            const zip64Record = await readRange(this.adb, this.path, zip64Offset, 56, { signal: this.signal, timeout: this.timeout });
            const zip64View = viewOf(zip64Record);
            if (zip64View.getUint32(0, true) !== ZIP64_EOCD_SIGNATURE) throw new Error('ZIP64 目录损坏');
            count = safeU64(zip64View, 32, 'APK 条目数');
            cdSize = safeU64(zip64View, 40, 'APK 目录');
            cdOffset = safeU64(zip64View, 48, 'APK 目录偏移');
            zip64 = true;
        }
        if (count > 500000 || cdSize > 64 * 1024 * 1024) throw new Error('APK 条目过多');
        if (!count) return { count, cdOffset, cdSize };

        // In ZIP64 archives the directory is separated from EOCD by the ZIP64
        // record and locator, so only trust the tail slice for classic archives.
        let cd = null;
        const cdStartInTail = eocd - cdSize;
        if (!zip64 && cdStartInTail >= 0) {
            const candidate = tail.subarray(cdStartInTail, eocd);
            if (candidate.length >= 46 && viewOf(candidate).getUint32(0, true) === CD_SIGNATURE) cd = candidate;
        }
        if (!cd) cd = await readRange(this.adb, this.path, cdOffset, cdSize, {
            signal: this.signal, timeout: this.timeout, maxBytes: cdSize + 65536,
        });
        if (cd.length !== cdSize) throw new Error('APK 目录长度不符');

        const cdView = viewOf(cd);
        let position = 0;
        for (let index = 0; index < count; index++) {
            if (position + 46 > cd.length || cdView.getUint32(position, true) !== CD_SIGNATURE) {
                throw new Error('APK 目录项损坏');
            }
            const nameLength = cdView.getUint16(position + 28, true);
            const extraLength = cdView.getUint16(position + 30, true);
            const commentLength = cdView.getUint16(position + 32, true);
            const end = position + 46 + nameLength + extraLength + commentLength;
            if (end > cd.length) throw new Error('APK 目录项越界');
            const name = new TextDecoder().decode(cd.subarray(position + 46, position + 46 + nameLength));
            const entry = {
                name,
                flags: cdView.getUint16(position + 8, true),
                method: cdView.getUint16(position + 10, true),
                compressedSize: cdView.getUint32(position + 20, true),
                uncompressedSize: cdView.getUint32(position + 24, true),
                localHeaderOffset: cdView.getUint32(position + 42, true),
            };
            if (entry.uncompressedSize === 0xffffffff || entry.compressedSize === 0xffffffff || entry.localHeaderOffset === 0xffffffff) {
                applyZip64Extra(cdView, position + 46 + nameLength, extraLength, entry);
            }
            this.entries.set(name, entry);
            position = end;
        }
        return { count, cdOffset, cdSize };
    }

    async entry(name) {
        await this.directory();
        return this.entries.get(name) || null;
    }

    async hasEntry(name) {
        return Boolean(await this.entry(name));
    }

    async readEntry(name, { maxSize = 16 * 1024 * 1024, signal, timeout } = {}) {
        const cached = this.inflated.get(name);
        if (cached) return cached;
        const entry = await this.entry(name);
        if (!entry) throw new Error(`APK 中缺少 ${name}`);
        if (entry.uncompressedSize > maxSize) throw new Error(`${name} 超过大小限制`);
        if (entry.compressedSize > maxSize * 2 + 1024 * 1024) throw new Error(`${name} 压缩数据过大`);

        const header = await readRange(this.adb, this.path, entry.localHeaderOffset, 30, {
            signal: signal || this.signal, timeout: timeout || this.timeout,
        });
        const headerView = viewOf(header);
        if (headerView.getUint32(0, true) !== LOCAL_SIGNATURE) throw new Error('APK 条目头损坏');
        const nameLength = headerView.getUint16(26, true);
        const extraLength = headerView.getUint16(28, true);
        const dataOffset = entry.localHeaderOffset + 30 + nameLength + extraLength;
        const compressed = entry.compressedSize
            ? await readRange(this.adb, this.path, dataOffset, entry.compressedSize, {
                signal: signal || this.signal,
                timeout: timeout || this.timeout,
                maxBytes: entry.compressedSize + 65536,
            })
            : new Uint8Array(0);
        let bytes;
        if (entry.method === 0) bytes = compressed;
        else if (entry.method === 8) bytes = await inflateRaw(compressed, maxSize);
        else throw new Error(`不支持的 APK 压缩方式 ${entry.method}`);
        if (bytes.length !== entry.uncompressedSize && entry.uncompressedSize !== 0) {
            throw new Error(`${name} 解压长度不符`);
        }
        this.inflated.set(name, bytes);
        return bytes;
    }
}

function applyZip64Extra(view, offset, length, entry) {
    const end = offset + length;
    let position = offset;
    while (position + 4 <= end) {
        const id = view.getUint16(position, true);
        const size = view.getUint16(position + 2, true);
        if (position + 4 + size > end) break;
        if (id === 0x0001) {
            let cursor = position + 4;
            const limit = cursor + size;
            for (const field of ['uncompressedSize', 'compressedSize', 'localHeaderOffset']) {
                if (entry[field] !== 0xffffffff) continue;
                if (cursor + 8 > limit) throw new Error('ZIP64 扩展字段损坏');
                entry[field] = safeU64(view, cursor, 'APK 条目');
                cursor += 8;
            }
        }
        position += 4 + size;
    }
}

async function inflateRaw(compressed, maxSize) {
    if (typeof DecompressionStream !== 'function') throw new Error('当前浏览器不支持解压 APK');
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const reader = stream.getReader();
    const chunks = [];
    let total = 0;
    try {
        for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > maxSize) throw new Error('APK 条目解压后过大');
            chunks.push(value);
        }
    } finally {
        try { await reader.cancel(); } catch { /* closed */ }
        try { reader.releaseLock(); } catch { /* released */ }
    }
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
    return result;
}
