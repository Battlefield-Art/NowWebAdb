import { VALUE_TYPE, parseColorText } from './binary';
import { androidAttribute, androidString } from './axml';
import type { AxmlElement } from './axml';
import type { ResourceResolver } from './resources';

export function vectorToSvg(root: AxmlElement, resources: ResourceResolver): string {
  const width = dimension(androidString(root, 'viewportWidth')) || 24;
  const height = dimension(androidString(root, 'viewportHeight')) || 24;
  const body = vectorChildren(root, resources, 0);
  if (!body) return '';
  const alpha = number(androidString(root, 'alpha'));
  const opacity = alpha === null ? '' : ` opacity="${clamp(alpha, 0, 1)}"`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}"${opacity}>${body}</svg>`
  );
}

function vectorChildren(element: AxmlElement, resources: ResourceResolver, depth: number): string {
  if (depth > 8) return '';
  const parts: string[] = [];
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
      ]
        .filter(Boolean)
        .join(' ');
      parts.push(`<path ${attributes}/>`);
    } else if (child.name === 'group') {
      const body = vectorChildren(child, resources, depth + 1);
      if (!body) continue;
      const transforms: string[] = [];
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
      const transform = transforms.length ? ` transform="${transforms.join(' ')}"` : '';
      parts.push(`<g${transform}>${body}</g>`);
    }
  }
  return parts.join('');
}

function vectorColor(element: AxmlElement, name: string, resources: ResourceResolver): number | null {
  const attribute = androidAttribute(element, name);
  if (!attribute) return null;
  if (attribute.ref) return resources.getColor(attribute.ref);
  if (typeof attribute.value === 'string') return parseColorText(attribute.value);
  if (attribute.type >= VALUE_TYPE.FIRST_COLOR && attribute.type <= VALUE_TYPE.LAST_COLOR) {
    return attribute.data >>> 0;
  }
  return null;
}

function cssColor(value: number): string {
  const argb = value >>> 0;
  const alpha = (argb >>> 24) & 0xff;
  const red = ((argb >>> 16) & 0xff).toString(16).padStart(2, '0');
  const green = ((argb >>> 8) & 0xff).toString(16).padStart(2, '0');
  const blue = (argb & 0xff).toString(16).padStart(2, '0');
  const rgb = `#${red}${green}${blue}`;
  return alpha === 0xff
    ? rgb
    : `rgba(${(argb >>> 16) & 0xff},${(argb >>> 8) & 0xff},${argb & 0xff},${(alpha / 255).toFixed(3)})`;
}

function escapeAttribute(value: string): string {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function dimension(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^\s*(-?\d+(?:\.\d+)?)/.exec(value);
  const digits = match?.[1];
  return digits === undefined ? null : Number(digits);
}

function number(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
