const utf8Decoder = new TextDecoder('utf-8');
const utf16Decoder = new TextDecoder('utf-16le');

export const RES_STRING_POOL_TYPE = 0x0001;

export function asDataView(bytes) {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export function hasChunk(bytes, view, offset, minSize = 8) {
    return offset >= 0 && offset + minSize <= bytes.length;
}

export function readChunkHeader(view, offset) {
    return {
        type: view.getUint16(offset, true),
        headerSize: view.getUint16(offset + 2, true),
        size: view.getUint32(offset + 4, true),
    };
}

export function parseStringPool(bytes, offset, expectedType = RES_STRING_POOL_TYPE) {
    const view = asDataView(bytes);
    if (!hasChunk(bytes, view, offset, 28)) throw new Error('字符串池越界');
    const { type, headerSize, size } = readChunkHeader(view, offset);
    if (type !== expectedType) throw new Error('不是字符串池');
    if (headerSize < 28 || size < headerSize || offset + size > bytes.length) throw new Error('字符串池损坏');
    const count = view.getUint32(offset + 8, true);
    const flags = view.getUint32(offset + 16, true);
    const stringsStart = view.getUint32(offset + 20, true);
    if (count > 200000 || headerSize + count * 4 > size || stringsStart > size) throw new Error('字符串池索引异常');
    const utf8 = (flags & 0x100) !== 0;
    const strings = new Array(count);
    for (let index = 0; index < count; index++) {
        const stringOffset = view.getUint32(offset + headerSize + index * 4, true);
        const base = offset + stringsStart + stringOffset;
        if (base >= offset + size || base >= bytes.length) { strings[index] = ''; continue; }
        strings[index] = utf8 ? decodeUtf8String(bytes, base, offset + size) : decodeUtf16String(bytes, base, offset + size);
    }
    return { strings, size, headerSize };
}

function decodeUtf8String(bytes, start, end) {
    let offset = start;
    let chars = bytes[offset++];
    if (chars === undefined) return '';
    if (chars & 0x80) {
        const next = bytes[offset++];
        if (next === undefined) return '';
        chars = ((chars & 0x7f) << 8) | next;
    }
    let byteLength = bytes[offset++];
    if (byteLength === undefined) return '';
    if (byteLength & 0x80) {
        const next = bytes[offset++];
        if (next === undefined) return '';
        byteLength = ((byteLength & 0x7f) << 8) | next;
    }
    if (offset + byteLength > end) return '';
    return utf8Decoder.decode(bytes.subarray(offset, offset + byteLength)).replace(/\0.*$/s, '');
}

function decodeUtf16String(bytes, start, end) {
    if (start + 2 > end) return '';
    const view = asDataView(bytes);
    let offset = start;
    let chars = view.getUint16(offset, true);
    offset += 2;
    if (chars & 0x8000) {
        if (offset + 2 > end) return '';
        chars = ((chars & 0x7fff) << 16) | view.getUint16(offset, true);
        offset += 2;
    }
    if (offset + chars * 2 > end) return '';
    return utf16Decoder.decode(bytes.subarray(offset, offset + chars * 2)).replace(/\0.*$/s, '');
}

export const VALUE_TYPE = {
    NULL: 0x00,
    REFERENCE: 0x01,
    ATTRIBUTE: 0x02,
    STRING: 0x03,
    FLOAT: 0x04,
    DIMENSION: 0x05,
    FRACTION: 0x06,
    INT_DEC: 0x10,
    INT_HEX: 0x11,
    INT_BOOLEAN: 0x12,
    FIRST_COLOR: 0x1c,
    LAST_COLOR: 0x1f,
};

export function readResValue(view, offset) {
    return {
        size: view.getUint16(offset, true),
        dataType: view.getUint8(offset + 3),
        data: view.getUint32(offset + 4, true),
    };
}

export function colorToCss(value) {
    const argb = value >>> 0;
    const alpha = ((argb >>> 24) & 0xff) / 255;
    const red = (argb >>> 16) & 0xff;
    const green = (argb >>> 8) & 0xff;
    const blue = argb & 0xff;
    return alpha >= 1 ? `#${hex(red)}${hex(green)}${hex(blue)}` : `rgba(${red},${green},${blue},${alpha.toFixed(3)})`;
}

function hex(value) {
    return value.toString(16).padStart(2, '0');
}

export function parseColorText(value) {
    if (typeof value !== 'string') return null;
    const match = /^#([0-9a-f]{3,8})$/i.exec(value.trim());
    if (!match) return null;
    let digits = match[1];
    if (digits.length === 3 || digits.length === 4) digits = digits.split('').map(part => part + part).join('');
    if (digits.length === 6) digits = `ff${digits}`;
    if (digits.length !== 8) return null;
    return Number.parseInt(digits, 16) >>> 0;
}
