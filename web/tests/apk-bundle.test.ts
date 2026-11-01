import { BlobReader, BlobWriter, ZipWriter } from '@zip.js/zip.js';
import { describe, expect, it } from 'vitest';
import { extractApkBundle, isBundleFile } from '@/lib/adb/apkBundle';
import { parseInstallUser } from '@/lib/adb/packages';
import { parseAndroidUsers } from '@/lib/adb/users';

describe('apk bundle handling', () => {
  it('recognizes .apks and .xapk archives', () => {
    expect(isBundleFile(new File(['x'], 'demo.xapk'))).toBe(true);
    expect(isBundleFile(new File(['x'], 'demo.APKS'))).toBe(true);
    expect(isBundleFile(new File(['x'], 'demo.apk'))).toBe(false);
    expect(isBundleFile(new File([], 'demo.xapk'))).toBe(false);
  });

  it('extracts base and split apks and ignores other entries', async () => {
    const writer = new ZipWriter(new BlobWriter('application/zip'), { useWebWorkers: false });
    await writer.add('base.apk', new BlobReader(new Blob(['base'])), { level: 0 });
    await writer.add('splits/config.arm64_v8a.apk', new BlobReader(new Blob(['split'])), { level: 0 });
    await writer.add('manifest.json', new BlobReader(new Blob(['{}'])), { level: 0 });
    const archive = await writer.close();
    const bundle = new File([archive], 'demo.xapk', { type: 'application/zip' });

    const files = await extractApkBundle(bundle);
    expect(files.map(file => file.name).sort()).toEqual(['base.apk', 'config.arm64_v8a.apk']);
    const base = files.find(file => file.name === 'base.apk');
    expect(base ? await base.text() : '').toBe('base');
  });

  it('rejects bundles without apk entries', async () => {
    const writer = new ZipWriter(new BlobWriter('application/zip'), { useWebWorkers: false });
    await writer.add('readme.txt', new BlobReader(new Blob(['hello'])), { level: 0 });
    const archive = await writer.close();
    await expect(extractApkBundle(new File([archive], 'empty.apks'))).rejects.toThrow(/没有找到 APK/);
  });
});

describe('multi-user install helpers', () => {
  it('parses pm list users output', () => {
    const output = [
      'Users:',
      '\tUserInfo{0:机主:13} running',
      '\tUserInfo{10:工作资料:30}',
      'mCurrentUser=0',
    ].join('\n');
    expect(parseAndroidUsers(output)).toEqual([
      { id: 0, name: '机主', running: true },
      { id: 10, name: '工作资料', running: false },
    ]);
  });

  it('maps the user selection to pm install --user values', () => {
    expect(parseInstallUser('current')).toBe('current');
    expect(parseInstallUser('all')).toBe('all');
    expect(parseInstallUser('10')).toBe(10);
    expect(parseInstallUser('0')).toBe('current');
    expect(parseInstallUser('bad')).toBe('current');
  });
});
