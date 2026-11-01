import { describe, expect, it } from 'vitest';
import { DEFAULT_BACKUP_REQUEST, normalizeBackupRequest } from '@/lib/adb/backup';

describe('backup request normalization', () => {
  it('defaults to user apps with their data', () => {
    expect(normalizeBackupRequest()).toEqual(DEFAULT_BACKUP_REQUEST);
    expect(DEFAULT_BACKUP_REQUEST.scope).toBe('user');
    expect(DEFAULT_BACKUP_REQUEST.savePackageApk).toBe(true);
    expect(DEFAULT_BACKUP_REQUEST.compress).toBe(true);
  });

  it('keeps a valid scope, user and include flags', () => {
    expect(
      normalizeBackupRequest({
        scope: 'all',
        user: 10,
        saveSharedStorage: true,
        saveWidgets: true,
        compress: false,
      }),
    ).toMatchObject({ scope: 'all', user: 10, saveSharedStorage: true, saveWidgets: true, compress: false });
  });

  it('falls back to user scope and rejects invalid user ids', () => {
    expect(normalizeBackupRequest({ scope: 'other' as never }).scope).toBe('user');
    expect(() => normalizeBackupRequest({ user: -1 })).toThrow();
    expect(() => normalizeBackupRequest({ user: 1.5 })).toThrow();
    expect(() => normalizeBackupRequest({ user: 1000 })).toThrow();
  });

  it('normalizes an explicit package selection', () => {
    expect(
      normalizeBackupRequest({ scope: 'packages', packages: ['com.example.b', ' com.example.a ', 'com.example.b'] }),
    ).toMatchObject({ scope: 'packages', packages: ['com.example.b', 'com.example.a'] });
  });

  it('requires valid packages only when scope is packages', () => {
    expect(() => normalizeBackupRequest({ scope: 'packages' })).toThrow();
    expect(() => normalizeBackupRequest({ scope: 'packages', packages: [] })).toThrow();
    expect(() => normalizeBackupRequest({ scope: 'packages', packages: ['bad pkg'] })).toThrow();
    expect(normalizeBackupRequest({ scope: 'all', packages: ['com.example.a'] }).packages).toEqual([]);
  });
});
