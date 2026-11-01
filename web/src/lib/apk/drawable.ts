import { androidAttribute, androidColor, androidDrawable, findChild, parseAxml } from './axml';
import type { AxmlElement, DrawableSpec } from './axml';
import { densityScore } from './arsc';
import type { DrawableCandidate, ResourceResolver } from './resources';
import { bytesToDataUrl, finalizeImage, imageMime, renderDrawable, svgDataUrl } from './render';
import type { IconOptions, LoadedDrawable } from './render';
import { vectorToSvg } from './vector';
import type { ApkEntry, RemoteApk } from './zip';

const ICON_LIMIT = 8 * 1024 * 1024;

const DENSITIES: Record<string, number> = {
  ldpi: 120,
  mdpi: 160,
  hdpi: 240,
  xhdpi: 320,
  xxhdpi: 480,
  xxxhdpi: 640,
};

export async function loadIconForResource(
  zip: RemoteApk,
  resources: ResourceResolver,
  resId: number,
  options: IconOptions,
): Promise<string> {
  const ranked = resources
    .getDrawableCandidates(resId)
    .map(candidate => ({ candidate, rank: drawableRank(candidate) }))
    .filter(item => item.rank > 0)
    .sort((a, b) => b.rank - a.rank);
  for (const { candidate } of ranked) {
    if ('path' in candidate) {
      const drawable = await loadFileDrawable(zip, resources, candidate.path, options);
      const icon = await renderDrawable(drawable);
      if (icon) return icon;
    }
  }
  return '';
}

export function drawableRank(candidate: DrawableCandidate): number {
  if (!('path' in candidate)) return 0;
  const kind = pathKind(candidate.path);
  if (kind === 'image') return 200000 + densityScore(candidate.density);
  if (kind === 'xml') return 100000 + densityScore(candidate.density);
  return 0;
}

function pathKind(path: string): 'image' | 'xml' | 'other' {
  const lower = path.toLowerCase();
  if (/\.(?:png|webp|jpe?g|gif|bmp)$/.test(lower)) return 'image';
  if (/\.xml$/.test(lower)) return 'xml';
  return 'other';
}

export async function loadFileDrawable(
  zip: RemoteApk,
  resources: ResourceResolver,
  path: string,
  options: IconOptions,
  depth = 0,
): Promise<LoadedDrawable | null> {
  if (depth > 8) return null;
  const kind = pathKind(path);
  if (kind === 'image') {
    const bytes = await zip.readEntry(path, {
      maxSize: ICON_LIMIT,
      signal: options.signal,
      timeout: options.timeout,
    });
    return { kind: 'image', url: bytesToDataUrl(bytes, imageMime(path)) };
  }
  if (kind !== 'xml') return null;
  const bytes = await zip.readEntry(path, {
    maxSize: ICON_LIMIT,
    signal: options.signal,
    timeout: options.timeout,
  });
  const root = parseAxml(bytes);
  return loadXmlDrawable(zip, resources, root, options, depth + 1);
}

async function loadXmlDrawable(
  zip: RemoteApk,
  resources: ResourceResolver,
  root: AxmlElement,
  options: IconOptions,
  depth: number,
): Promise<LoadedDrawable | null> {
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
    return resolveDrawableSpec(zip, resources, androidDrawable(root, 'src'), options, depth + 1);
  }
  if (root.name === 'inset') {
    return resolveDrawableSpec(zip, resources, androidDrawable(root, 'drawable'), options, depth + 1);
  }
  if (root.name === 'layer-list' || root.name === 'selector' || root.name === 'animated-selector') {
    for (const item of root.children) {
      if (item.name !== 'item') continue;
      let spec: DrawableSpec | null = androidDrawable(item, 'drawable');
      if (!spec && androidAttribute(item, 'color')) {
        const color = androidColor(item, 'color');
        spec = color === null ? null : { color };
      }
      if (!spec) continue;
      const drawable = await resolveDrawableSpec(zip, resources, spec, options, depth + 1);
      // A color-only layer is not a usable app icon; keep looking for an image.
      if (drawable && drawable.kind !== 'color') return drawable;
    }
  }
  return null;
}

async function resolveDrawableSpec(
  zip: RemoteApk,
  resources: ResourceResolver,
  spec: DrawableSpec | null,
  options: IconOptions,
  depth: number,
): Promise<LoadedDrawable | null> {
  if (!spec || depth > 8) return null;
  if ('color' in spec) return { kind: 'color', color: spec.color >>> 0 };
  if ('ref' in spec) {
    const ranked = resources
      .getDrawableCandidates(spec.ref)
      .map(candidate => ({ candidate, rank: drawableRank(candidate) }))
      .filter(item => item.rank > 0)
      .sort((a, b) => b.rank - a.rank);
    const best = ranked[0]?.candidate;
    if (best && 'path' in best) return loadFileDrawable(zip, resources, best.path, options, depth + 1);
    const color = resources.getColor(spec.ref);
    if (color !== null) return { kind: 'color', color };
    return null;
  }
  if ('path' in spec) return loadFileDrawable(zip, resources, spec.path, options, depth + 1);
  return null;
}

export async function findFallbackIcon(zip: RemoteApk, options: IconOptions): Promise<string> {
  await zip.directory();
  const candidates = [...zip.entries.values()]
    .filter(entry => /^res\/(?:mipmap|drawable)[^/]*\/[^/]*(?:launcher|icon)[^/]*\.(?:png|webp)$/i.test(entry.name))
    .map(entry => ({ entry, rank: fallbackRank(entry) }))
    .sort((a, b) => b.rank - a.rank);
  for (const candidate of candidates.slice(0, 4)) {
    try {
      const bytes = await zip.readEntry(candidate.entry.name, {
        maxSize: ICON_LIMIT,
        signal: options.signal,
        timeout: options.timeout,
      });
      return await finalizeImage(bytesToDataUrl(bytes, imageMime(candidate.entry.name)));
    } catch {
      /* Try the next candidate. */
    }
  }
  return '';
}

function fallbackRank(entry: ApkEntry): number {
  const match = /res\/(?:mipmap|drawable)-([a-z]+)/i.exec(entry.name);
  const key = match?.[1]?.toLowerCase();
  const density = key ? DENSITIES[key] ?? 0 : 0;
  const launcher = /ic_launcher/i.test(entry.name) ? 1000 : 0;
  return launcher + density;
}
