import type { RemoteFile } from '@/lib/adb/files';
import { t } from '@/lib/i18n';

export type FileSortKey = 'name' | 'size' | 'mtime';

export function sortFiles(
  files: readonly RemoteFile[],
  key: FileSortKey,
  ascending: boolean,
): RemoteFile[] {
  const direction = ascending ? 1 : -1;
  return [...files].sort((left, right) => {
    if (left.isDirectory !== right.isDirectory) return left.isDirectory ? -1 : 1;
    if (key === 'size' && left.size !== right.size) {
      return (left.size - right.size) * direction;
    }
    if (key === 'mtime' && left.mtime.getTime() !== right.mtime.getTime()) {
      return (left.mtime.getTime() - right.mtime.getTime()) * direction;
    }
    return left.name.localeCompare(right.name, 'zh-Hans-CN', { sensitivity: 'base' }) * direction;
  });
}

export function filterFiles(files: readonly RemoteFile[], query: string): RemoteFile[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return [...files];
  return files.filter(file => file.name.toLowerCase().includes(keyword));
}

/** Cheap identity of a listing; `listDirectory` already sorts, so equal content hashes equal. */
export function filesSignature(files: readonly RemoteFile[]): string {
  return files.map(file => `${file.name}|${file.size}|${file.mtime.getTime()}`).join('\n');
}

export type FileKind =
  | 'folder'
  | 'image'
  | 'video'
  | 'audio'
  | 'archive'
  | 'apk'
  | 'code'
  | 'text'
  | 'file';

const EXTENSION_KINDS: Readonly<Record<string, FileKind>> = {
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', bmp: 'image', heic: 'image', svg: 'image',
  mp4: 'video', mkv: 'video', webm: 'video', mov: 'video', avi: 'video', m4v: 'video',
  mp3: 'audio', wav: 'audio', flac: 'audio', ogg: 'audio', m4a: 'audio', aac: 'audio',
  zip: 'archive', rar: 'archive', '7z': 'archive', gz: 'archive', tar: 'archive', xz: 'archive',
  apk: 'apk', apks: 'apk', xapk: 'apk',
  js: 'code', ts: 'code', tsx: 'code', jsx: 'code', json: 'code', xml: 'code', html: 'code', css: 'code',
  sh: 'code', py: 'code', java: 'code', kt: 'code', c: 'code', cpp: 'code', h: 'code', gradle: 'code',
  txt: 'text', log: 'text', md: 'text', ini: 'text', conf: 'text', prop: 'text', csv: 'text', yaml: 'text', yml: 'text',
};

export function fileExtension(name: string): string {
  const index = name.lastIndexOf('.');
  return index > 0 ? name.slice(index + 1).toLowerCase() : '';
}

export function fileKind(file: Pick<RemoteFile, 'name' | 'isDirectory'>): FileKind {
  if (file.isDirectory) return 'folder';
  return EXTENSION_KINDS[fileExtension(file.name)] ?? 'file';
}

export function fileTypeLabel(file: Pick<RemoteFile, 'name' | 'isDirectory' | 'isLink'>): string {
  if (file.isLink) return t('files.details.symlink');
  if (file.isDirectory) return t('files.type.folder');
  const extension = fileExtension(file.name);
  return extension ? t('files.type.withExtension', { extension: extension.toUpperCase() }) : t('files.type.file');
}

export function isTextLike(file: Pick<RemoteFile, 'name' | 'isDirectory'>): boolean {
  const kind = fileKind(file);
  return kind === 'text' || kind === 'code';
}

export function formatFileTime(date: Date | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return '—';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isProbablyBinary(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, Math.min(bytes.length, 4096));
  for (const byte of sample) {
    if (byte === 0) return true;
  }
  return false;
}
