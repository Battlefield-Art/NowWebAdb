import { parseColorText } from './binary.js';
import { parseArsc, densityScore } from './arsc.js';
import { androidAttribute, androidColor, androidDrawable, androidInt, androidRef, androidString, findChild, parseAxml } from './axml.js';
import { RemoteApk } from './apkZip.js';

const MANIFEST_LIMIT = 8 * 1024 * 1024;
const ARSC_LIMIT = 48 * 1024 * 1024;
const ICON_LIMIT = 8 * 1024 * 1024;
const NO_RESOURCES = { getColor: () => null, getDrawableCandidates: () => [] };

export async function extractAppInfo(adb, app, { signal, timeout = 30000, locale } = {}) {
    const zip = new RemoteApk(adb, app.sourceDir, { signal, timeout });
    let manifestBytes;
    try {
        manifestBytes = await zip.readEntry('AndroidManifest.xml', { maxSize: MANIFEST_LIMIT, signal, timeout });
    } catch (error) {
        throw new Error(`读取应用清单失败：${error.message}`);
    }
    const manifest = readManifest(parseAxml(manifestBytes));

    let resources = null;
    try {
        const arsc = await zip.readEntry('resources.arsc', { maxSize: ARSC_LIMIT, signal, timeout });
        resources = parseArsc(arsc);
    } catch { /* Manifest still yields package/version even without resources. */ }

    const preferredLocale = resolveLocale(locale);
    let appName = manifest.label.startsWith('@') ? '' : manifest.label;
    if (resources && manifest.labelRef) {
        appName = resources.getString(manifest.labelRef, preferredLocale) || appName;
    }
    appName = cleanText(appName || app.packageName) || app.packageName;

    let iconBase64 = '';
    if (manifest.iconLiteral) {
        try {
            const drawable = await loadFileDrawable(zip, resources || NO_RESOURCES, manifest.iconLiteral, { signal, timeout });
            iconBase64 = (await renderDrawable(drawable, { signal, timeout })) || '';
        } catch { /* Fall through to the standard launcher icon lookup. */ }
    }
    if (!iconBase64 && resources && (manifest.iconRef || manifest.roundIconRef)) {
        try {
            iconBase64 = await loadIconForResource(zip, resources, manifest.iconRef || manifest.roundIconRef, { signal, timeout });
        } catch { /* Keep the generic icon when one APK entry is malformed. */ }
    }
    if (!iconBase64) {
        try { iconBase64 = await findFallbackIcon(zip, { signal, timeout }); } catch { /* No usable launcher image. */ }
    }

    return {
        appName,
        versionName: cleanText(manifest.versionName) || cleanText(app.versionName) || '',
        versionCode: manifest.versionCode ?? app.versionCode,
        minSdk: manifest.minSdk,
        targetSdk: manifest.targetSdk,
        permissions: manifest.permissions,
        iconBase64,
    };
}

function readManifest(root) {
    const application = findChild(root, 'application');
    const usesSdk = findChild(root, 'uses-sdk');
    const permissions = root.children
        .filter(child => child.name === 'uses-permission' || child.name === 'uses-permission-sdk-23')
        .map(child => androidString(child, 'name'))
        .filter(Boolean);
    const iconRaw = androidString(application, 'icon');
    return {
        labelRef: androidRef(application, 'label'),
        label: androidString(application, 'label'),
        iconRef: androidRef(application, 'icon'),
        roundIconRef: androidRef(application, 'roundIcon'),
        iconLiteral: /^(?:res\/|assets\/).+\.(?:png|webp|jpe?g|xml)$/i.test(iconRaw) ? iconRaw : '',
        versionName: androidString(root, 'versionName'),
        versionCode: androidInt(root, 'versionCode'),
        minSdk: androidInt(usesSdk, 'minSdkVersion'),
        targetSdk: androidInt(usesSdk, 'targetSdkVersion'),
        permissions,
    };
}

function resolveLocale(value) {
    const raw = value || (typeof navigator !== 'undefined' ? navigator.language : '') || 'en-US';
    const [language, region] = raw.toLowerCase().split('-');
    return { language: language || '', region: region || '' };
}

function cleanText(value) {
    if (typeof value !== 'string') return '';
    return value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
}

async function loadIconForResource(zip, resources, resId, options) {
    const candidates = resources.getDrawableCandidates(resId);
    const ranked = candidates
        .map(candidate => ({ ...candidate, rank: drawableRank(candidate) }))
        .filter(candidate => candidate.rank > 0)
        .sort((a, b) => b.rank - a.rank);
    for (const candidate of ranked) {
        if (candidate.path) {
            const drawable = await loadFileDrawable(zip, resources, candidate.path, options);
            const icon = await renderDrawable(drawable, options);
            if (icon) return icon;
        }
    }
    return '';
}

function drawableRank(candidate) {
    if (!candidate.path) return 0;
    const kind = pathKind(candidate.path);
    if (kind === 'image') return 200000 + densityScore(candidate.density);
    if (kind === 'xml') return 100000 + densityScore(candidate.density);
    return 0;
}

function pathKind(path) {
    const lower = path.toLowerCase();
    if (/\.(?:png|webp|jpe?g|gif|bmp)$/.test(lower)) return 'image';
    if (/\.xml$/.test(lower)) return 'xml';
    return 'other';
}

async function loadFileDrawable(zip, resources, path, options, depth = 0) {
    if (depth > 8) return null;
    const kind = pathKind(path);
    if (kind === 'image') {
        const bytes = await zip.readEntry(path, { maxSize: ICON_LIMIT, signal: options.signal, timeout: options.timeout });
        return { kind: 'image', url: bytesToDataUrl(bytes, imageMime(path)) };
    }
    if (kind !== 'xml') return null;
    const bytes = await zip.readEntry(path, { maxSize: ICON_LIMIT, signal: options.signal, timeout: options.timeout });
    const root = parseAxml(bytes);
    return loadXmlDrawable(zip, resources, root, options, depth + 1);
}

async function loadXmlDrawable(zip, resources, root, options, depth) {
    if (depth > 8) return null;
    if (root.name === 'adaptive-icon') {
        const backgroundNode = findChild(root, 'background');
        const foregroundNode = findChild(root, 'foreground');
        const [background, foreground] = await Promise.all([
            resolveDrawableSpec(zip, resources, androidDrawable(backgroundNode, 'drawable'), options, depth + 1),
            resolveDrawableSpec(zip, resources, androidDrawable(foregroundNode, 'drawable'), options, depth + 1),
        ]);
        return { kind: 'adaptive', background, foreground };
    }
    if (root.name === 'vector') {
        const svg = vectorToSvg(root, resources);
        if (!svg) return null;
        return { kind: 'image', url: svgDataUrl(svg) };
    }
    if (root.name === 'bitmap') {
        const spec = androidDrawable(root, 'src');
        return resolveDrawableSpec(zip, resources, spec, options, depth + 1);
    }
    if (root.name === 'inset') {
        return resolveDrawableSpec(zip, resources, androidDrawable(root, 'drawable'), options, depth + 1);
    }
    if (root.name === 'layer-list' || root.name === 'selector' || root.name === 'animated-selector') {
        for (const item of root.children) {
            if (item.name !== 'item') continue;
            const spec = androidDrawable(item, 'drawable')
                || (androidAttribute(item, 'color') ? { color: androidColor(item, 'color') } : null);
            if (!spec) continue;
            const drawable = await resolveDrawableSpec(zip, resources, spec, options, depth + 1);
            // A color-only layer is not a usable app icon; keep looking for an image.
            if (drawable && drawable.kind !== 'color') return drawable;
        }
    }
    return null;
}

async function resolveDrawableSpec(zip, resources, spec, options, depth) {
    if (!spec || depth > 8) return null;
    if (spec.color != null) return { kind: 'color', color: spec.color >>> 0 };
    if (spec.ref) {
        const candidates = resources.getDrawableCandidates(spec.ref);
        const ranked = candidates
            .map(candidate => ({ ...candidate, rank: drawableRank(candidate) }))
            .filter(candidate => candidate.rank > 0)
            .sort((a, b) => b.rank - a.rank);
        if (ranked.length) {
            const best = ranked[0];
            if (best.path) return loadFileDrawable(zip, resources, best.path, options, depth + 1);
        }
        const color = resources.getColor(spec.ref);
        if (color !== null) return { kind: 'color', color };
        return null;
    }
    if (spec.path) return loadFileDrawable(zip, resources, spec.path, options, depth + 1);
    return null;
}

async function renderDrawable(drawable, options) {
    if (!drawable) return '';
    if (drawable.kind === 'color') return '';
    if (drawable.kind === 'image') return finalizeImage(drawable.url);
    if (drawable.kind === 'adaptive') {
        const background = drawable.background?.kind === 'image' ? drawable.background.url : null;
        const backgroundImage = background;
        const foreground = drawable.foreground?.kind === 'image' ? drawable.foreground.url : null;
        const backgroundColor = drawable.background?.kind === 'color' ? drawable.background.color : null;
        const composed = await composeAdaptive({ backgroundImage, backgroundColor, foreground });
        if (composed) return composed;
        return finalizeImage(foreground || backgroundImage || '');
    }
    return '';
}

async function composeAdaptive({ backgroundImage, backgroundColor, foreground }) {
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
        return foreground || backgroundImage || '';
    }
    const size = 192;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return foreground || backgroundImage || '';
    if (backgroundImage) {
        const image = await loadImage(backgroundImage);
        if (image) drawCover(context, image, size);
    } else if (backgroundColor != null) {
        context.fillStyle = colorCss(backgroundColor);
        context.fillRect(0, 0, size, size);
    }
    if (foreground) {
        const image = await loadImage(foreground);
        if (image) context.drawImage(image, 0, 0, size, size);
    }
    try { return canvas.toDataURL('image/png'); } catch { return foreground || backgroundImage || ''; }
}

async function finalizeImage(url, size = 128) {
    if (!url) return '';
    if (typeof document === 'undefined' || typeof Image === 'undefined') return url;
    const image = await loadImage(url);
    if (!image) return url;
    if (!image.naturalWidth || !image.naturalHeight) return url;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return url;
    const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.drawImage(image, Math.round((size - width) / 2), Math.round((size - height) / 2), width, height);
    try { return canvas.toDataURL('image/png'); } catch { return url; }
}

function loadImage(url) {
    return new Promise(resolve => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(null);
        image.src = url;
    });
}

function drawCover(context, image, size) {
    const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
}

function colorCss(value) {
    const argb = value >>> 0;
    const alpha = ((argb >>> 24) & 0xff) / 255;
    return `rgba(${(argb >>> 16) & 0xff},${(argb >>> 8) & 0xff},${argb & 0xff},${alpha})`;
}

function imageMime(path) {
    const lower = path.toLowerCase();
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.bmp')) return 'image/bmp';
    return 'image/png';
}

function bytesToDataUrl(bytes, mime) {
    return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

function svgDataUrl(svg) {
    return bytesToDataUrl(new TextEncoder().encode(svg), 'image/svg+xml');
}

function bytesToBase64(bytes) {
    let binary = '';
    const chunkSize = 8192;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
}

function vectorToSvg(root, resources) {
    const width = dimension(androidString(root, 'viewportWidth')) || 24;
    const height = dimension(androidString(root, 'viewportHeight')) || 24;
    const body = vectorChildren(root, resources, 0);
    if (!body) return '';
    const alpha = number(androidString(root, 'alpha'));
    const opacity = alpha === null ? '' : ` opacity="${clamp(alpha, 0, 1)}"`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"${opacity}>${body}</svg>`;
}

function vectorChildren(element, resources, depth) {
    if (depth > 8) return '';
    const parts = [];
    for (const child of element.children) {
        if (child.name === 'path') {
            const data = androidString(child, 'pathData');
            if (!data) continue;
            const fill = vectorColor(child, 'fillColor', resources);
            const stroke = vectorColor(child, 'strokeColor', resources);
            const fillAlpha = number(androidString(child, 'fillAlpha'));
            const strokeAlpha = number(androidString(child, 'strokeAlpha'));
            const strokeWidth = dimension(androidString(child, 'strokeWidth'));
            const attributes = [
                `d="${escapeAttribute(data)}"`,
                `fill="${fill == null ? 'none' : cssColor(fill)}"`,
                stroke == null ? '' : `stroke="${cssColor(stroke)}"`,
                strokeWidth == null || stroke == null ? '' : `stroke-width="${strokeWidth}"`,
                fillAlpha == null ? '' : `fill-opacity="${clamp(fillAlpha, 0, 1)}"`,
                strokeAlpha == null ? '' : `stroke-opacity="${clamp(strokeAlpha, 0, 1)}"`,
                androidString(child, 'fillType').toLowerCase() === 'evenodd' ? 'fill-rule="evenodd"' : '',
            ].filter(Boolean).join(' ');
            parts.push(`<path ${attributes}/>`);
        } else if (child.name === 'group') {
            const body = vectorChildren(child, resources, depth + 1);
            if (!body) continue;
            const transforms = [];
            const translateX = dimension(androidString(child, 'translateX')) || 0;
            const translateY = dimension(androidString(child, 'translateY')) || 0;
            const scaleX = number(androidString(child, 'scaleX'));
            const scaleY = number(androidString(child, 'scaleY'));
            const rotation = number(androidString(child, 'rotation')) || 0;
            const pivotX = dimension(androidString(child, 'pivotX')) || 0;
            const pivotY = dimension(androidString(child, 'pivotY')) || 0;
            if (translateX || translateY) transforms.push(`translate(${translateX} ${translateY})`);
            if (rotation) transforms.push(`rotate(${rotation} ${pivotX} ${pivotY})`);
            if (scaleX != null || scaleY != null) transforms.push(`scale(${scaleX ?? 1} ${scaleY ?? 1})`);
            parts.push(`<g${transforms.length ? ` transform="${transforms.join(' ')}"` : ''}>${body}</g>`);
        }
    }
    return parts.join('');
}

function vectorColor(element, name, resources) {
    const attribute = androidAttribute(element, name);
    if (!attribute) return null;
    if (attribute.ref) return resources.getColor(attribute.ref);
    if (typeof attribute.value === 'string') return parseColorText(attribute.value);
    if (attribute.type >= 0x1c && attribute.type <= 0x1f) return attribute.data >>> 0;
    return null;
}

function cssColor(value) {
    const argb = value >>> 0;
    const alpha = (argb >>> 24) & 0xff;
    const rgb = `#${((argb >>> 16) & 0xff).toString(16).padStart(2, '0')}${((argb >>> 8) & 0xff).toString(16).padStart(2, '0')}${(argb & 0xff).toString(16).padStart(2, '0')}`;
    return alpha === 0xff ? rgb : `rgba(${(argb >>> 16) & 0xff},${(argb >>> 8) & 0xff},${argb & 0xff},${(alpha / 255).toFixed(3)})`;
}

function escapeAttribute(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function dimension(value) {
    if (typeof value !== 'string') return null;
    const match = /^\s*(-?\d+(?:\.\d+)?)/.exec(value);
    return match ? Number(match[1]) : null;
}

function number(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return null;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

async function findFallbackIcon(zip, options) {
    await zip.directory();
    const candidates = [...zip.entries.values()]
        .filter(entry => /^res\/(?:mipmap|drawable)[^/]*\/[^/]*(?:launcher|icon)[^/]*\.(?:png|webp)$/i.test(entry.name))
        .map(entry => ({ entry, rank: fallbackRank(entry) }))
        .sort((a, b) => b.rank - a.rank);
    for (const candidate of candidates.slice(0, 4)) {
        try {
            const bytes = await zip.readEntry(candidate.entry.name, { maxSize: ICON_LIMIT, signal: options.signal, timeout: options.timeout });
            return await finalizeImage(bytesToDataUrl(bytes, imageMime(candidate.entry.name)));
        } catch { /* Try the next candidate. */ }
    }
    return '';
}

function fallbackRank(entry) {
    const match = /res\/(?:mipmap|drawable)-([a-z]+)/i.exec(entry.name);
    const densities = { ldpi: 120, mdpi: 160, hdpi: 240, xhdpi: 320, xxhdpi: 480, xxxhdpi: 640 };
    const density = densities[match?.[1]?.toLowerCase()] || 0;
    const launcher = /ic_launcher/i.test(entry.name) ? 1000 : 0;
    return launcher + density;
}
