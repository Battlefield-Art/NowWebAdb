import { deflateRawSync } from 'node:zlib';

export const ANDROID_NS = 'http://schemas.android.com/apk/res/android';

export function concat(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
        result.set(part, offset);
        offset += part.length;
    }
    return result;
}

function stringPool(strings) {
    const encoded = strings.map(value => {
        const units = value.length;
        const bytes = new Uint8Array(2 + units * 2 + 2);
        const view = new DataView(bytes.buffer);
        view.setUint16(0, units, true);
        for (let index = 0; index < units; index++) view.setUint16(2 + index * 2, value.charCodeAt(index), true);
        return bytes;
    });
    const headerSize = 28;
    const stringsStart = headerSize + strings.length * 4;
    const size = stringsStart + encoded.reduce((sum, bytes) => sum + bytes.length, 0);
    const result = new Uint8Array(size);
    const view = new DataView(result.buffer);
    view.setUint16(0, 0x0001, true);
    view.setUint16(2, headerSize, true);
    view.setUint32(4, size, true);
    view.setUint32(8, strings.length, true);
    view.setUint32(20, stringsStart, true);
    let offset = 0;
    encoded.forEach((bytes, index) => {
        view.setUint32(headerSize + index * 4, offset, true);
        result.set(bytes, stringsStart + offset);
        offset += bytes.length;
    });
    return result;
}

function startChunk({ ns, name, attrs }) {
    const size = 36 + attrs.length * 20;
    const result = new Uint8Array(size);
    const view = new DataView(result.buffer);
    view.setUint16(0, 0x0102, true);
    view.setUint16(2, 16, true);
    view.setUint32(4, size, true);
    view.setUint32(12, 0xffffffff, true);
    view.setUint32(16, ns, true);
    view.setUint32(20, name, true);
    view.setUint16(24, 20, true);
    view.setUint16(26, 20, true);
    view.setUint16(28, attrs.length, true);
    let offset = 36;
    for (const attr of attrs) {
        view.setUint32(offset, attr.ns, true);
        view.setUint32(offset + 4, attr.name, true);
        view.setUint32(offset + 8, attr.raw, true);
        view.setUint16(offset + 12, 8, true);
        view.setUint8(offset + 15, attr.type);
        view.setUint32(offset + 16, attr.data, true);
        offset += 20;
    }
    return result;
}

function endChunk({ ns, name }) {
    const result = new Uint8Array(24);
    const view = new DataView(result.buffer);
    view.setUint16(0, 0x0103, true);
    view.setUint16(2, 16, true);
    view.setUint32(4, 24, true);
    view.setUint32(12, 0xffffffff, true);
    view.setUint32(16, ns, true);
    view.setUint32(20, name, true);
    return result;
}

export function buildAxml(root) {
    const strings = [];
    const intern = value => {
        let index = strings.indexOf(value);
        if (index < 0) index = strings.push(value) - 1;
        return index;
    };
    const collect = node => {
        intern(node.name);
        if (node.ns) intern(node.ns);
        for (const attr of node.attrs || []) {
            intern(attr.name);
            if (attr.ns) intern(attr.ns);
            if (attr.rawValue != null) intern(attr.rawValue);
        }
        for (const child of node.children || []) collect(child);
    };
    collect(root);

    const chunks = [];
    const walk = node => {
        const ns = node.ns ? intern(node.ns) : 0xffffffff;
        chunks.push(startChunk({
            ns,
            name: intern(node.name),
            attrs: (node.attrs || []).map(attr => {
                const raw = attr.rawValue != null ? intern(attr.rawValue) : 0xffffffff;
                return {
                    ns: attr.ns ? intern(attr.ns) : 0xffffffff,
                    name: intern(attr.name),
                    raw,
                    type: attr.type ?? 0x03,
                    data: attr.data ?? (raw === 0xffffffff ? 0 : raw),
                };
            }),
        }));
        for (const child of node.children || []) walk(child);
        chunks.push(endChunk({ ns, name: intern(node.name) }));
    };
    walk(root);

    const pool = stringPool(strings);
    const header = new Uint8Array(8);
    const view = new DataView(header.buffer);
    view.setUint16(0, 0x0003, true);
    view.setUint16(2, 8, true);
    view.setUint32(4, 8 + pool.length + chunks.reduce((sum, chunk) => sum + chunk.length, 0), true);
    return concat([header, pool, ...chunks]);
}

export function buildManifest({
    appNameRef = 0x7f010000,
    iconRef = 0x7f020000,
    literalLabel = null,
    versionName = '1.2.3',
    versionCode = 42,
    minSdk = 24,
    targetSdk = 34,
    permission = 'android.permission.INTERNET',
} = {}) {
    return buildAxml({
        name: 'manifest',
        attrs: [
            { name: 'versionCode', ns: ANDROID_NS, type: 0x10, data: versionCode },
            { name: 'versionName', ns: ANDROID_NS, rawValue: versionName },
        ],
        children: [
            {
                name: 'uses-sdk',
                attrs: [
                    { name: 'minSdkVersion', ns: ANDROID_NS, type: 0x10, data: minSdk },
                    { name: 'targetSdkVersion', ns: ANDROID_NS, type: 0x10, data: targetSdk },
                ],
            },
            { name: 'uses-permission', attrs: [{ name: 'name', ns: ANDROID_NS, rawValue: permission }] },
            {
                name: 'application',
                attrs: [
                    literalLabel != null
                        ? { name: 'label', ns: ANDROID_NS, rawValue: literalLabel }
                        : { name: 'label', ns: ANDROID_NS, type: 0x01, data: appNameRef },
                    ...(iconRef ? [{ name: 'icon', ns: ANDROID_NS, type: 0x01, data: iconRef }] : []),
                ],
            },
        ],
    });
}

function typeChunk({ typeId, density, entries }) {
    const headerSize = 40;
    const entriesStart = headerSize + entries.length * 4;
    const size = entriesStart + entries.length * 16;
    const result = new Uint8Array(size);
    const view = new DataView(result.buffer);
    view.setUint16(0, 0x0201, true);
    view.setUint16(2, headerSize, true);
    view.setUint32(4, size, true);
    view.setUint8(8, typeId);
    view.setUint32(12, entries.length, true);
    view.setUint32(16, entriesStart, true);
    view.setUint32(20, 20, true);
    view.setUint16(34, density, true);
    entries.forEach((entry, index) => {
        view.setUint32(headerSize + index * 4, index * 16, true);
        const offset = entriesStart + index * 16;
        view.setUint16(offset, 8, true);
        view.setUint32(offset + 4, entry.key, true);
        view.setUint16(offset + 8, 8, true);
        view.setUint8(offset + 11, entry.dataType);
        view.setUint32(offset + 12, entry.data, true);
    });
    return result;
}

export function buildArsc({ appName = '测试应用', iconPath = 'res/mipmap-hdpi/ic_launcher.png', density = 160, mipmaps } = {}) {
    const drawables = mipmaps || [{ key: 'ic_launcher', path: iconPath, density }];
    const packageId = 0x7f;
    const globalPool = stringPool([appName, ...drawables.map(item => item.path)]);
    const typePool = stringPool(['string', 'mipmap']);
    const keyPool = stringPool(['app_name', ...drawables.map(item => item.key)]);
    const typeStrings = 288;
    const keyStrings = typeStrings + typePool.length;
    const typesStart = keyStrings + keyPool.length;
    const stringType = typeChunk({ typeId: 1, density, entries: [{ key: 0, dataType: 0x03, data: 0 }] });
    const mipmapType = typeChunk({
        typeId: 2,
        density: drawables[0]?.density ?? density,
        entries: drawables.map((_, index) => ({ key: index + 1, dataType: 0x03, data: index + 1 })),
    });
    const packageSize = typesStart + stringType.length + mipmapType.length;

    const result = new Uint8Array(12 + globalPool.length + packageSize);
    const view = new DataView(result.buffer);
    view.setUint16(0, 0x0002, true);
    view.setUint16(2, 12, true);
    view.setUint32(4, result.length, true);
    view.setUint32(8, 1, true);
    result.set(globalPool, 12);

    const packageOffset = 12 + globalPool.length;
    view.setUint16(packageOffset, 0x0200, true);
    view.setUint16(packageOffset + 2, 288, true);
    view.setUint32(packageOffset + 4, packageSize, true);
    view.setUint32(packageOffset + 8, packageId, true);
    view.setUint32(packageOffset + 268, typeStrings, true);
    view.setUint32(packageOffset + 276, keyStrings, true);
    result.set(typePool, packageOffset + typeStrings);
    result.set(keyPool, packageOffset + keyStrings);
    result.set(stringType, packageOffset + typesStart);
    result.set(mipmapType, packageOffset + typesStart + stringType.length);
    return result;
}

export function buildZip(entries, { zip64 = false } = {}) {
    const encoder = new TextEncoder();
    const parts = [];
    const directory = [];
    let offset = 0;
    for (const entry of entries) {
        const name = encoder.encode(entry.name);
        const method = entry.method ?? 0;
        const payload = method === 8 ? new Uint8Array(deflateRawSync(Buffer.from(entry.data))) : entry.data;
        const local = new Uint8Array(30 + name.length);
        const view = new DataView(local.buffer);
        view.setUint32(0, 0x04034b50, true);
        view.setUint16(4, 20, true);
        view.setUint16(8, method, true);
        view.setUint32(18, payload.length, true);
        view.setUint32(22, entry.data.length, true);
        view.setUint16(26, name.length, true);
        local.set(name, 30);
        directory.push({ name, method, compressed: payload.length, uncompressed: entry.data.length, offset });
        parts.push(local, payload);
        offset += local.length + payload.length;
    }
    const cdOffset = offset;
    const central = directory.map(entry => {
        const bytes = new Uint8Array(46 + entry.name.length);
        const view = new DataView(bytes.buffer);
        view.setUint32(0, 0x02014b50, true);
        view.setUint16(4, 20, true);
        view.setUint16(6, 20, true);
        view.setUint16(10, entry.method, true);
        view.setUint32(20, entry.compressed, true);
        view.setUint32(24, entry.uncompressed, true);
        view.setUint16(28, entry.name.length, true);
        view.setUint32(42, entry.offset, true);
        bytes.set(entry.name, 46);
        return bytes;
    });
    const cdSize = central.reduce((sum, bytes) => sum + bytes.length, 0);

    if (zip64) {
        const record = new Uint8Array(56);
        const view = new DataView(record.buffer);
        view.setUint32(0, 0x06064b50, true);
        view.setBigUint64(4, 44n, true);
        view.setUint16(12, 45, true);
        view.setUint16(14, 45, true);
        view.setBigUint64(24, BigInt(directory.length), true);
        view.setBigUint64(32, BigInt(directory.length), true);
        view.setBigUint64(40, BigInt(cdSize), true);
        view.setBigUint64(48, BigInt(cdOffset), true);
        const locator = new Uint8Array(20);
        const locatorView = new DataView(locator.buffer);
        locatorView.setUint32(0, 0x07064b50, true);
        locatorView.setBigUint64(8, BigInt(cdOffset + cdSize), true);
        locatorView.setUint32(16, 1, true);
        parts.push(...central, record, locator);
        const eocd = new Uint8Array(22);
        const eocdView = new DataView(eocd.buffer);
        eocdView.setUint32(0, 0x06054b50, true);
        eocdView.setUint16(8, 0xffff, true);
        eocdView.setUint16(10, 0xffff, true);
        eocdView.setUint32(12, 0xffffffff, true);
        eocdView.setUint32(16, 0xffffffff, true);
        return concat([...parts, eocd]);
    }

    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    eocdView.setUint32(0, 0x06054b50, true);
    eocdView.setUint16(8, directory.length, true);
    eocdView.setUint16(10, directory.length, true);
    eocdView.setUint32(12, cdSize, true);
    eocdView.setUint32(16, cdOffset, true);
    return concat([...parts, ...central, eocd]);
}

export const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
export const PNG_BYTES = Uint8Array.from(Buffer.from(PNG_BASE64, 'base64'));

export function iconApk({ manifest = buildManifest(), arsc = buildArsc(), icon = PNG_BYTES } = {}) {
    const entries = [
        { name: 'AndroidManifest.xml', data: manifest, method: 8 },
    ];
    if (arsc) entries.push({ name: 'resources.arsc', data: arsc, method: 8 });
    if (icon) entries.push({ name: 'res/mipmap-hdpi/ic_launcher.png', data: icon, method: 0 });
    return buildZip(entries);
}

function stream(bytes) {
    return new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } });
}

export function fakeAdb(files) {
    const commands = [];
    const spawn = async command => {
        commands.push(command);
        const tail = /^tail -c (\d+) '([^']+)' 2>\/dev\/null$/.exec(command);
        const dd = /^dd if='([^']+)' bs=65536 skip=(\d+) count=(\d+) 2>\/dev\/null$/.exec(command);
        const path = tail?.[2] ?? dd?.[1];
        const file = path && files[path];
        if (!file) throw new Error(`unexpected command: ${command}`);
        let data;
        if (tail) data = file.subarray(Math.max(0, file.length - Number(tail[1])));
        else data = file.subarray(Number(dd[2]) * 65536, Math.min(file.length, (Number(dd[2]) + Number(dd[3])) * 65536));
        return { stdout: stream(data), stderr: stream(new Uint8Array(0)), exited: Promise.resolve(0), kill() {} };
    };
    return {
        adb: { subprocess: { shellProtocol: { isSupported: true, spawn }, noneProtocol: { spawn } } },
        commands,
    };
}

export function hangingAdb() {
    const stream = () => new ReadableStream({ start() {} });
    return {
        subprocess: {
            shellProtocol: {
                isSupported: true,
                spawn: async () => ({
                    stdout: stream(),
                    stderr: stream(),
                    exited: new Promise(() => {}),
                    kill() {},
                }),
            },
        },
    };
}
