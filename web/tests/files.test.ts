import { describe, expect, it } from 'vitest';
import {
  joinRemotePath,
  normalizeRemotePath,
  parentRemotePath,
  remoteBaseName,
  remotePathSegments,
  validateRemoteName,
} from '@/lib/adb/paths';
import { formatMode, formatOctal } from '@/lib/adb/files';
import { filterFiles, filesSignature, sortFiles } from '@/features/files/fileUtils';
import type { RemoteFile } from '@/lib/adb/files';

function file(name: string, options: Partial<RemoteFile> = {}): RemoteFile {
  return {
    name,
    path: `/sdcard/${name}`,
    size: 0,
    mtime: new Date(0),
    isDirectory: false,
    isLink: false,
    permission: 0o644,
    ...options,
  };
}

describe('remote path helpers', () => {
  it('normalizes relative and redundant segments', () => {
    expect(normalizeRemotePath('')).toBe('/');
    expect(normalizeRemotePath('/')).toBe('/');
    expect(normalizeRemotePath('sdcard')).toBe('/sdcard');
    expect(normalizeRemotePath('/sdcard//Download/')).toBe('/sdcard/Download');
    expect(normalizeRemotePath('/sdcard/./a/../b')).toBe('/sdcard/b');
    expect(normalizeRemotePath('/../../etc')).toBe('/etc');
  });

  it('rejects control characters', () => {
    expect(() => normalizeRemotePath('/sdcard/\u0001bad')).toThrow();
  });

  it('joins names without duplicating slashes', () => {
    expect(joinRemotePath('/sdcard', 'file.txt')).toBe('/sdcard/file.txt');
    expect(joinRemotePath('/', 'sdcard')).toBe('/sdcard');
    expect(joinRemotePath('/sdcard/DCIM', '../Download')).toBe('/sdcard/Download');
  });

  it('computes parents and base names', () => {
    expect(parentRemotePath('/sdcard/DCIM')).toBe('/sdcard');
    expect(parentRemotePath('/sdcard')).toBe('/');
    expect(parentRemotePath('/')).toBe('/');
    expect(remoteBaseName('/sdcard/a.txt')).toBe('a.txt');
    expect(remoteBaseName('/')).toBe('/');
  });

  it('builds breadcrumb segments', () => {
    expect(remotePathSegments('/sdcard/DCIM')).toEqual([
      { name: '/', path: '/' },
      { name: 'sdcard', path: '/sdcard' },
      { name: 'DCIM', path: '/sdcard/DCIM' },
    ]);
    expect(remotePathSegments('/')).toEqual([{ name: '/', path: '/' }]);
  });

  it('validates entry names', () => {
    expect(validateRemoteName(' backups ')).toBe('backups');
    expect(() => validateRemoteName('')).toThrow();
    expect(() => validateRemoteName('.')).toThrow();
    expect(() => validateRemoteName('..')).toThrow();
    expect(() => validateRemoteName('a/b')).toThrow();
    expect(() => validateRemoteName('bad\u0000name')).toThrow();
  });
});

describe('file permission formatting', () => {
  it('renders type and permission bits', () => {
    expect(formatMode(0o040755)).toBe('drwxr-xr-x');
    expect(formatMode(0o100644)).toBe('-rw-r--r--');
    expect(formatMode(0o120777)).toBe('lrwxrwxrwx');
  });

  it('renders setuid, setgid and sticky bits', () => {
    expect(formatMode(0o104755)).toBe('-rwsr-xr-x');
    expect(formatMode(0o104644)).toBe('-rwSr--r--');
    expect(formatMode(0o41777)).toBe('drwxrwxrwt');
  });

  it('formats octal permissions', () => {
    expect(formatOctal(0o644)).toBe('0644');
    expect(formatOctal(0o4755)).toBe('4755');
  });
});

describe('file sorting and filtering', () => {
  const entries = [
    file('b.txt', { size: 20, mtime: new Date(2_000) }),
    file('a.txt', { size: 10, mtime: new Date(1_000) }),
    file('FolderA', { isDirectory: true, mtime: new Date(3_000) }),
    file('folderB', { isDirectory: true, mtime: new Date(500) }),
  ];

  it('keeps directories first', () => {
    const sorted = sortFiles(entries, 'name', true);
    expect(sorted.map(entry => entry.name)).toEqual(['FolderA', 'folderB', 'a.txt', 'b.txt']);
  });

  it('sorts by size and time within groups', () => {
    expect(sortFiles(entries, 'size', false).map(entry => entry.name)).toEqual([
      'folderB',
      'FolderA',
      'b.txt',
      'a.txt',
    ]);
    expect(sortFiles(entries, 'mtime', true).map(entry => entry.name)).toEqual([
      'folderB',
      'FolderA',
      'a.txt',
      'b.txt',
    ]);
  });

  it('filters names case-insensitively', () => {
    expect(filterFiles(entries, 'FOLDER').map(entry => entry.name)).toEqual(['FolderA', 'folderB']);
    expect(filterFiles(entries, '  ')).toHaveLength(4);
    expect(filterFiles(entries, 'missing')).toHaveLength(0);
  });
});

describe('file listing signature', () => {
  it('ignores fields the table does not treat as a change', () => {
    expect(filesSignature([file('a.txt'), file('b.txt', { isDirectory: true })])).toBe(
      filesSignature([file('a.txt', { permission: 0o600 }), file('b.txt')]),
    );
  });

  it('reacts to added entries and to size or mtime changes', () => {
    const before = filesSignature([file('a.txt')]);
    expect(filesSignature([file('a.txt'), file('b.txt')])).not.toBe(before);
    expect(filesSignature([file('a.txt', { size: 2 })])).not.toBe(before);
    expect(filesSignature([file('a.txt', { mtime: new Date(1_000) })])).not.toBe(before);
  });

  it('depends on order because the listing is sorted', () => {
    expect(filesSignature([file('a.txt'), file('b.txt')])).not.toBe(
      filesSignature([file('b.txt'), file('a.txt')]),
    );
  });

  it('is stable for an empty directory', () => {
    expect(filesSignature([])).toBe('');
  });
});
