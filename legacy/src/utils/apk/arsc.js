import { VALUE_TYPE, asDataView, hasChunk, parseColorText, parseStringPool, readChunkHeader, readResValue } from './binary.js';

const RES_TABLE_TYPE = 0x0002;
const RES_TABLE_PACKAGE_TYPE = 0x0200;
const RES_TABLE_TYPE_TYPE = 0x0201;
const RES_TABLE_TYPE_SPEC_TYPE = 0x0202;
const FLAG_SPARSE = 0x01;
const FLAG_OFFSET16 = 0x02;
const ENTRY_FLAG_COMPLEX = 0x0001;
const ENTRY_FLAG_COMPACT = 0x0008;
const DENSITY_ANY = 0xfffe;
const DENSITY_NONE = 0xffff;

export function parseArsc(bytes) {
    const view = asDataView(bytes);
    if (!hasChunk(bytes, view, 0, 12) || view.getUint16(0, true) !== RES_TABLE_TYPE) {
        throw new Error('resources.arsc 格式无效');
    }
    const headerSize = view.getUint16(2, true);
    const totalSize = Math.min(view.getUint32(4, true), bytes.length);
    const packageCount = view.getUint32(8, true);
    const globalStrings = [];
    const entries = new Map();
    const packages = [];
    let position = headerSize;
    while (position + 8 <= totalSize) {
        const { type, size } = readChunkHeader(view, position);
        if (size < 8 || position + size > totalSize) throw new Error('resources.arsc 块越界');
        if (type === 0x0001 && !globalStrings.length) {
            const pool = parseStringPool(bytes, position);
            globalStrings.push(...pool.strings);
        } else if (type === RES_TABLE_PACKAGE_TYPE) {
            packages.push(parsePackage(bytes, view, position, size, entries));
        }
        position += size;
        if (packages.length > packageCount + 16) break;
    }
    if (!globalStrings.length) throw new Error('resources.arsc 缺少字符串池');
    return createResources(globalStrings, entries, packages);
}

function parsePackage(bytes, view, start, size, entries) {
    const headerSize = view.getUint16(start + 2, true);
    if (headerSize < 284 || start + headerSize > start + size) throw new Error('资源包头损坏');
    const packageId = view.getUint32(start + 8, true);
    const typeStrings = view.getUint32(start + 268, true);
    const keyStrings = view.getUint32(start + 276, true);
    const typeIdOffset = headerSize >= 288 ? view.getUint32(start + 284, true) : 0;
    if (!typeStrings || !keyStrings) throw new Error('资源包字符串表缺失');
    const typePool = parseStringPool(bytes, start + typeStrings).strings;
    const keyPoolChunk = parseStringPool(bytes, start + keyStrings);
    const keyPool = keyPoolChunk.strings;
    let position = start + keyStrings + keyPoolChunk.size;
    const end = start + size;
    let count = 0;
    while (position + 8 <= end) {
        const { type, size: chunkSize } = readChunkHeader(view, position);
        if (chunkSize < 8 || position + chunkSize > end) break;
        if (type === RES_TABLE_TYPE_TYPE) {
            parseType(bytes, view, position, chunkSize, { packageId, typeIdOffset, typePool, keyPool, entries });
            if (++count > 200000) break;
        } else if (type !== RES_TABLE_TYPE_SPEC_TYPE) {
            // Library/overlay/staged-alias chunks are irrelevant for labels and icons.
        }
        position += chunkSize;
    }
    return { packageId, typePool, keyPool };
}

function parseType(bytes, view, start, size, { packageId, typeIdOffset, typePool, keyPool, entries }) {
    const headerSize = view.getUint16(start + 2, true);
    if (headerSize < 20 || start + headerSize > start + size) return;
    const typeId = view.getUint8(start + 8);
    const flags = view.getUint8(start + 9);
    const entryCount = view.getUint32(start + 12, true);
    const entriesStart = view.getUint32(start + 16, true);
    if (entryCount > 2000000) throw new Error('资源条目过多');
    const configSize = headerSize - 20;
    const density = configSize >= 16 ? view.getUint16(start + 20 + 14, true) : 0;
    const language = configSize >= 10 ? readLocalePart(bytes, start + 20 + 8) : '';
    const country = configSize >= 12 ? readLocalePart(bytes, start + 20 + 10) : '';
    const config = { density, language, country };
    const typeName = typePool[typeId - 1] || '';
    const resourceTypeId = typeId + typeIdOffset;
    const offsetsStart = start + headerSize;
    const dataStart = start + entriesStart;
    const chunkEnd = start + size;

    for (let index = 0; index < entryCount; index++) {
        let entryIndex = index;
        let offset;
        if (flags & FLAG_SPARSE) {
            if (offsetsStart + index * 4 + 4 > chunkEnd) break;
            entryIndex = view.getUint16(offsetsStart + index * 4, true);
            offset = view.getUint16(offsetsStart + index * 4 + 2, true) * 4;
        } else if (flags & FLAG_OFFSET16) {
            if (offsetsStart + index * 2 + 2 > chunkEnd) break;
            const value = view.getUint16(offsetsStart + index * 2, true);
            if (value === 0xffff) continue;
            offset = value * 4;
        } else {
            if (offsetsStart + index * 4 + 4 > chunkEnd) break;
            const value = view.getUint32(offsetsStart + index * 4, true);
            if (value === 0xffffffff) continue;
            offset = value;
        }
        const entryOffset = dataStart + offset;
        if (entryOffset + 8 > chunkEnd) continue;
        const entry = parseEntry(bytes, view, entryOffset, chunkEnd, keyPool);
        if (!entry) continue;
        const resId = ((packageId << 24) | (resourceTypeId << 16) | entryIndex) >>> 0;
        let list = entries.get(resId);
        if (!list) { list = []; entries.set(resId, list); }
        list.push({ ...entry, config, typeName });
    }
}

function parseEntry(bytes, view, offset, chunkEnd, keyPool) {
    const sizeOrKey = view.getUint16(offset, true);
    const flags = view.getUint16(offset + 2, true);
    if (flags & ENTRY_FLAG_COMPACT) {
        if (offset + 8 > chunkEnd) return null;
        return {
            key: keyPool[sizeOrKey] || '',
            dataType: (flags >>> 8) & 0xff,
            data: view.getUint32(offset + 4, true),
        };
    }
    if (sizeOrKey < 8 || offset + sizeOrKey + 8 > chunkEnd) return null;
    if (flags & ENTRY_FLAG_COMPLEX) return null;
    const key = keyPool[view.getUint32(offset + 4, true)] || '';
    const value = readResValue(view, offset + sizeOrKey);
    return { key, dataType: value.dataType, data: value.data };
}

function readLocalePart(bytes, offset) {
    if (offset + 2 > bytes.length) return '';
    const first = bytes[offset];
    if (first === 0 && bytes[offset + 1] === 0) return '';
    if (first & 0x80) return 'zz';
    return String.fromCharCode(first, bytes[offset + 1]).replace(/\0/g, '').toLowerCase();
}

function createResources(globalStrings, entries, packages) {
    const localeInfo = () => {
        const locale = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
        const [language, region] = locale.toLowerCase().split('-');
        return { language: language || '', region: region || '' };
    };

    function getStringWithDepth(resId, locale, depth) {
        if (depth > 8) return '';
        const candidates = entries.get(resId >>> 0);
        if (!candidates?.length) return '';
        const scored = candidates.map(entry => ({ entry, score: stringScore(entry.config, locale) }))
            .sort((a, b) => b.score - a.score);
        for (const { entry } of scored) {
            if (entry.dataType === VALUE_TYPE.REFERENCE) {
                const nested = getStringWithDepth(entry.data, locale, depth + 1);
                if (nested) return nested;
                continue;
            }
            if (entry.dataType === VALUE_TYPE.STRING) return globalStrings[entry.data] || '';
        }
        return '';
    }

    function getString(resId, locale = localeInfo()) {
        return getStringWithDepth(resId, locale, 0);
    }

    function getDrawableCandidates(resId) {
        const candidates = entries.get(resId >>> 0);
        if (!candidates?.length) return [];
        const result = [];
        const seen = new Set();
        const walk = (list, depth) => {
            if (depth > 8) return;
            for (const entry of list) {
                if (entry.dataType === VALUE_TYPE.REFERENCE) {
                    walk(entries.get(entry.data >>> 0) || [], depth + 1);
                } else if (entry.dataType === VALUE_TYPE.STRING) {
                    const path = globalStrings[entry.data] || '';
                    if (!path) continue;
                    const key = `${path}|${entry.config.density}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    result.push({ path, density: entry.config.density, config: entry.config });
                } else if (entry.dataType >= VALUE_TYPE.FIRST_COLOR && entry.dataType <= VALUE_TYPE.LAST_COLOR) {
                    result.push({ color: entry.data >>> 0, density: entry.config.density, config: entry.config });
                }
            }
        };
        walk(candidates, 0);
        return result;
    }

    function getColor(resId, depth = 0) {
        if (depth > 8) return null;
        const candidates = entries.get(resId >>> 0);
        if (!candidates?.length) return null;
        for (const entry of candidates) {
            if (entry.dataType === VALUE_TYPE.REFERENCE) {
                const nested = getColor(entry.data, depth + 1);
                if (nested !== null) return nested;
            } else if (entry.dataType >= VALUE_TYPE.FIRST_COLOR && entry.dataType <= VALUE_TYPE.LAST_COLOR) {
                return entry.data >>> 0;
            } else if (entry.dataType === VALUE_TYPE.STRING) {
                const text = globalStrings[entry.data] || '';
                const parsed = parseColorText(text);
                if (parsed !== null) return parsed;
            }
        }
        return null;
    }

    return { globalStrings, entries, packages, getString, getDrawableCandidates, getColor };
}

function stringScore(config, locale) {
    if (!config.language) return 10;
    let score = 0;
    if (config.language === locale.language) score = 30;
    if (score && locale.region && config.country === locale.region) score = 40;
    return score;
}

export function densityScore(density) {
    if (density === DENSITY_ANY) return 700;
    if (density === DENSITY_NONE) return 0;
    return density || 0;
}
