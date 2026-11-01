import { t } from '@/lib/i18n';

function hasControlCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/** Normalizes an absolute or relative path into an absolute, `..`-free form. */
export function normalizeRemotePath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '/';
  if (hasControlCharacter(trimmed)) throw new Error(t('files.error.pathControlChars'));
  const segments: string[] = [];
  for (const segment of trimmed.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return `/${segments.join('/')}`;
}

export function joinRemotePath(base: string, name: string): string {
  if (name.startsWith('/')) return normalizeRemotePath(name);
  return normalizeRemotePath(`${base}/${name}`);
}

export function parentRemotePath(path: string): string {
  const segments = normalizeRemotePath(path).split('/').filter(Boolean);
  segments.pop();
  return `/${segments.join('/')}`;
}

export function remoteBaseName(path: string): string {
  const normalized = normalizeRemotePath(path);
  if (normalized === '/') return '/';
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}

export interface PathSegment {
  name: string;
  path: string;
}

export function remotePathSegments(path: string): PathSegment[] {
  const segments: PathSegment[] = [{ name: '/', path: '/' }];
  let current = '';
  for (const segment of normalizeRemotePath(path).split('/').filter(Boolean)) {
    current += `/${segment}`;
    segments.push({ name: segment, path: current });
  }
  return segments;
}

/** Validates a single file or folder name (not a path). */
export function validateRemoteName(name: string): string {
  const value = name.trim();
  if (!value) throw new Error(t('files.error.nameEmpty'));
  if (value === '.' || value === '..') throw new Error(t('files.error.nameDot'));
  if (value.includes('/')) throw new Error(t('files.error.nameSlash'));
  if (hasControlCharacter(value)) throw new Error(t('files.error.nameControlChars'));
  if (value.length > 255) throw new Error(t('files.error.nameTooLong'));
  return value;
}
