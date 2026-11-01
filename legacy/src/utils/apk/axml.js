import { VALUE_TYPE, asDataView, hasChunk, parseColorText, parseStringPool, readChunkHeader, readResValue } from './binary.js';

const RES_XML_TYPE = 0x0003;
const RES_XML_RESOURCE_MAP_TYPE = 0x0180;
const RES_XML_START_ELEMENT_TYPE = 0x0102;
const RES_XML_END_ELEMENT_TYPE = 0x0103;
const RES_XML_CDATA_TYPE = 0x0104;
const ANDROID_NS = 'http://schemas.android.com/apk/res/android';

export function parseAxml(bytes) {
    const view = asDataView(bytes);
    if (!hasChunk(bytes, view, 0) || view.getUint16(0, true) !== RES_XML_TYPE) {
        throw new Error('AndroidManifest.xml 不是二进制 XML');
    }
    const headerSize = view.getUint16(2, true);
    const totalSize = Math.min(view.getUint32(4, true), bytes.length);
    let strings = null;
    let resourceMap = [];
    let root = null;
    const stack = [];
    let position = headerSize;
    let elements = 0;

    while (position + 8 <= totalSize) {
        const { type, headerSize: chunkHeader, size } = readChunkHeader(view, position);
        if (size < 8 || position + size > totalSize) throw new Error('清单 XML 块越界');
        if (type === 0x0001) {
            strings = parseStringPool(bytes, position).strings;
        } else if (type === RES_XML_RESOURCE_MAP_TYPE) {
            const count = Math.floor((size - chunkHeader) / 4);
            resourceMap = new Array(count);
            for (let index = 0; index < count; index++) resourceMap[index] = view.getUint32(position + chunkHeader + index * 4, true);
        } else if (type === RES_XML_START_ELEMENT_TYPE) {
            if (!strings) throw new Error('清单 XML 缺少字符串池');
            const element = parseStartElement(bytes, view, position, chunkHeader, strings, resourceMap);
            if (stack.length) stack[stack.length - 1].children.push(element);
            else if (!root) root = element;
            stack.push(element);
            if (++elements > 100000) throw new Error('清单 XML 元素过多');
        } else if (type === RES_XML_END_ELEMENT_TYPE) {
            stack.pop();
        } else if (type === RES_XML_CDATA_TYPE) {
            if (stack.length && strings) {
                const data = view.getUint32(position + chunkHeader, true);
                const element = stack[stack.length - 1];
                element.text = (element.text || '') + (strings[data] || '');
            }
        }
        position += size;
    }
    if (!root) throw new Error('清单 XML 没有根节点');
    return root;
}

function parseStartElement(bytes, view, offset, headerSize, strings, resourceMap) {
    if (offset + headerSize + 20 > bytes.length) throw new Error('清单 XML 元素越界');
    const nsIndex = view.getUint32(offset + headerSize, true);
    const nameIndex = view.getUint32(offset + headerSize + 4, true);
    const attributeStart = view.getUint16(offset + headerSize + 8, true);
    const attributeSize = view.getUint16(offset + headerSize + 10, true);
    const attributeCount = view.getUint16(offset + headerSize + 12, true);
    if (attributeSize < 20 || attributeCount > 20000) throw new Error('清单 XML 属性异常');
    const attributes = new Array(attributeCount);
    const attributesOffset = offset + headerSize + attributeStart;
    if (attributesOffset + attributeCount * attributeSize > bytes.length) throw new Error('清单 XML 属性越界');
    for (let index = 0; index < attributeCount; index++) {
        const base = attributesOffset + index * attributeSize;
        const attrNs = view.getUint32(base, true);
        const attrName = view.getUint32(base + 4, true);
        const rawValue = view.getUint32(base + 8, true);
        const typed = readResValue(view, base + 12);
        const name = strings[attrName] || '';
        const value = attributeValue(strings, rawValue, typed);
        attributes[index] = {
            ns: attrNs === 0xffffffff ? '' : strings[attrNs] || '',
            name,
            resourceId: resourceMap[attrName] || 0,
            raw: rawValue === 0xffffffff ? null : strings[rawValue] ?? null,
            value,
            ref: typed.dataType === VALUE_TYPE.REFERENCE ? typed.data : 0,
            type: typed.dataType,
            data: typed.data,
        };
    }
    return {
        name: strings[nameIndex] || '',
        ns: nsIndex === 0xffffffff ? '' : strings[nsIndex] || '',
        attributes,
        children: [],
    };
}

function attributeValue(strings, rawValue, typed) {
    if (rawValue !== 0xffffffff) return strings[rawValue] ?? '';
    if (typed.dataType === VALUE_TYPE.STRING) return strings[typed.data] ?? '';
    if (typed.dataType === VALUE_TYPE.INT_BOOLEAN) return typed.data !== 0;
    if (typed.dataType >= VALUE_TYPE.FIRST_COLOR && typed.dataType <= VALUE_TYPE.LAST_COLOR) return typed.data;
    if (typed.dataType === VALUE_TYPE.INT_DEC || typed.dataType === VALUE_TYPE.INT_HEX || typed.dataType === VALUE_TYPE.FLOAT) return typed.data;
    return null;
}

export function findChild(element, name) {
    return element?.children.find(child => child.name === name) || null;
}

export function findChildren(element, name) {
    return element?.children.filter(child => child.name === name) || [];
}

export function androidAttribute(element, name) {
    if (!element) return null;
    return element.attributes.find(attribute => attribute.name === name && attribute.ns === ANDROID_NS)
        || element.attributes.find(attribute => attribute.name === name && !attribute.ns)
        || null;
}

export function androidString(element, name) {
    const attribute = androidAttribute(element, name);
    if (!attribute) return '';
    if (typeof attribute.value === 'string') return attribute.value;
    return attribute.raw || '';
}

export function androidRef(element, name) {
    const attribute = androidAttribute(element, name);
    return attribute?.ref || 0;
}

export function androidInt(element, name) {
    const attribute = androidAttribute(element, name);
    if (!attribute) return null;
    if (typeof attribute.value === 'number') return attribute.value >>> 0;
    if (typeof attribute.value === 'string' && /^-?\d+$/.test(attribute.value.trim())) return Number(attribute.value);
    return attribute.type === VALUE_TYPE.INT_DEC || attribute.type === VALUE_TYPE.INT_HEX ? attribute.data >>> 0 : null;
}

export function androidColor(element, name) {
    const attribute = androidAttribute(element, name);
    if (!attribute) return null;
    if (typeof attribute.value === 'string') return parseColorText(attribute.value);
    if (attribute.type >= VALUE_TYPE.FIRST_COLOR && attribute.type <= VALUE_TYPE.LAST_COLOR) return attribute.data >>> 0;
    return null;
}

export function androidDrawable(element, name) {
    const attribute = androidAttribute(element, name);
    if (!attribute) return null;
    if (attribute.ref) return { ref: attribute.ref };
    if (typeof attribute.value === 'string') {
        if (attribute.value.startsWith('@')) return { refText: attribute.value };
        const color = parseColorText(attribute.value);
        if (color !== null) return { color };
        return { path: attribute.value };
    }
    if (attribute.type >= VALUE_TYPE.FIRST_COLOR && attribute.type <= VALUE_TYPE.LAST_COLOR) return { color: attribute.data >>> 0 };
    return null;
}
