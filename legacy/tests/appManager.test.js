import test from 'node:test';
import assert from 'node:assert/strict';
import {
    acquireAppMetadata, exportAppApks, installApks,
    listInstalledApps, performAppAction, runAppCommand, shellEscape,
    uninstallApp, validateApkPath, validatePackageName,
} from '../src/utils/appManager.js';
import { extractAppInfo } from '../src/utils/apk/apkInfo.js';
import { RemoteApk } from '../src/utils/apk/apkZip.js';
import {
    ANDROID_NS, PNG_BASE64, PNG_BYTES, buildArsc, buildAxml, buildManifest, buildZip, fakeAdb, hangingAdb, iconApk,
} from './apkFixtures.js';

const encoder = new TextEncoder();
const textStream = text => new ReadableStream({ start(c) { c.enqueue(encoder.encode(text)); c.close(); } });
const app = { packageName: 'com.example.app', sourceDir: '/data/app/~~abc==/com.example.app-hash/base.apk' };

function commandAdb(output, { exit = 0, stderr = '', legacy = false } = {}) {
    let killed = 0;
    let command;
    const spawn = async value => {
        command = value;
        return {
            ...(legacy ? { output: textStream(output) } : { stdout: textStream(output), stderr: textStream(stderr) }),
            exited: Promise.resolve(legacy ? undefined : exit),
            kill() { killed++; },
        };
    };
    return { subprocess: { shellProtocol: { isSupported: !legacy, spawn }, noneProtocol: { spawn } }, get killed() { return killed; }, get command() { return command; } };
}

test('validate Android package names, APK paths and shell escaping', () => {
    for (const value of ['android', 'com.example.app', 'com.example_name.app2']) assert.equal(validatePackageName(value), value);
    for (const value of ['', 'a..b', '-a', 'com.a;id', 'a\nb', 'a b', '$(id)', 'a/b']) assert.throws(() => validatePackageName(value));
    for (const value of [app.sourceDir, "/data/app/a 'quoted'/base.apk", '/system/app/Test/Test.apk']) assert.equal(validateApkPath(value), value);
    for (const value of ['base.apk', '/tmp/base.apk\rfoo', '/a/../base.apk', '/a/./base.apk', '/a/base.zip', '/a/base.apk\0']) assert.throws(() => validateApkPath(value));
    assert.equal(shellEscape("a'b"), "'a'\\''b'");
});

test('listing works without helper and resets/deduplicates results with requested filters', async () => {
    let options;
    const pm = { async *listPackages(value) { options = value; yield app; yield { ...app, versionCode: 2 }; } };
    const first = await listInstalledApps({}, { scope: 'thirdParty', enabled: 'disabled', packageManager: pm });
    const second = await listInstalledApps({}, { scope: 'system', packageManager: pm });
    assert.equal(first.length, 1);
    assert.equal(second.length, 1);
    assert.equal(first[0].appName, app.packageName);
    assert.equal(first[0].metadataLoaded, false);
    assert.equal(first[0].versionCode, 2);
    assert.equal(options.listSystem, true);
    assert.equal(options.listThirdParty, undefined);
    assert.equal(options.showUid, true);
    await assert.rejects(listInstalledApps({}, { packageManager: { async *listPackages() { throw new Error('list failed'); } } }), /list failed/);
});

test('remote APK reads resolve manifest, label, permissions and icon without device helpers', async () => {
    const { adb, commands } = fakeAdb({ [app.sourceDir]: iconApk() });
    const info = await extractAppInfo(adb, app, { locale: 'zh-CN' });
    assert.equal(info.appName, '测试应用');
    assert.equal(info.versionName, '1.2.3');
    assert.equal(info.versionCode, 42);
    assert.equal(info.minSdk, 24);
    assert.equal(info.targetSdk, 34);
    assert.deepEqual(info.permissions, ['android.permission.INTERNET']);
    assert.equal(info.iconBase64, `data:image/png;base64,${PNG_BASE64}`);
    assert.ok(commands.length >= 4);
    assert.ok(commands.every(command => /^(?:tail -c |dd if=)/.test(command)));
    assert.equal('sync' in adb, false);
    assert.equal('createSocket' in adb, false);
});

test('literal labels and standalone launcher images work without resources.arsc', async () => {
    const manifest = buildManifest({ literalLabel: 'Literal App', iconRef: 0 });
    const { adb } = fakeAdb({ [app.sourceDir]: iconApk({ manifest, arsc: null }) });
    const info = await extractAppInfo(adb, app);
    assert.equal(info.appName, 'Literal App');
    assert.equal(info.iconBase64, `data:image/png;base64,${PNG_BASE64}`);
    assert.equal(info.versionCode, 42);
});

test('adaptive icons resolve their layers and vector paths render as SVG', async () => {
    const adaptive = buildAxml({
        name: 'adaptive-icon',
        children: [
            { name: 'background', attrs: [{ name: 'drawable', ns: ANDROID_NS, type: 0x01, data: 0x7f020001 }] },
            { name: 'foreground', attrs: [{ name: 'drawable', ns: ANDROID_NS, type: 0x01, data: 0x7f020002 }] },
        ],
    });
    const vector = buildAxml({
        name: 'vector',
        attrs: [
            { name: 'viewportWidth', ns: ANDROID_NS, rawValue: '24' },
            { name: 'viewportHeight', ns: ANDROID_NS, rawValue: '24' },
        ],
        children: [{
            name: 'path',
            attrs: [
                { name: 'pathData', ns: ANDROID_NS, rawValue: 'M0,0 L24,24' },
                { name: 'fillColor', ns: ANDROID_NS, rawValue: '#FF0000' },
                { name: 'strokeColor', ns: ANDROID_NS, rawValue: '#00FF00' },
                { name: 'strokeWidth', ns: ANDROID_NS, rawValue: '2' },
            ],
        }],
    });
    const arsc = buildArsc({
        mipmaps: [
            { key: 'ic_launcher', path: 'res/mipmap-anydpi-v26/ic_launcher.xml', density: 0xfffe },
            { key: 'ic_launcher_background', path: 'res/drawable/ic_launcher_background.png' },
            { key: 'ic_launcher_foreground', path: 'res/drawable/ic_launcher_foreground.xml' },
        ],
    });
    const apk = buildZip([
        { name: 'AndroidManifest.xml', data: buildManifest({ iconRef: 0x7f020000 }), method: 8 },
        { name: 'resources.arsc', data: arsc, method: 8 },
        { name: 'res/mipmap-anydpi-v26/ic_launcher.xml', data: adaptive, method: 8 },
        { name: 'res/drawable/ic_launcher_background.png', data: PNG_BYTES, method: 0 },
        { name: 'res/drawable/ic_launcher_foreground.xml', data: vector, method: 8 },
    ]);
    const { adb } = fakeAdb({ [app.sourceDir]: apk });
    const info = await extractAppInfo(adb, app);
    const prefix = 'data:image/svg+xml;base64,';
    assert.ok(info.iconBase64.startsWith(prefix));
    const svg = Buffer.from(info.iconBase64.slice(prefix.length), 'base64').toString('utf8');
    assert.match(svg, /viewBox="0 0 24 24"/);
    assert.match(svg, /d="M0,0 L24,24"/);
    assert.match(svg, /fill="#ff0000"/);
    assert.match(svg, /stroke="#00ff00"/);
    assert.match(svg, /stroke-width="2"/);
});

test('ZIP64 directories are read from their own offset instead of the EOCD tail', async () => {
    const file = buildZip([{ name: 'a.txt', data: encoder.encode('hello') }], { zip64: true });
    const { adb, commands } = fakeAdb({ '/tmp/base.apk': file });
    const zip = new RemoteApk(adb, '/tmp/base.apk');
    assert.equal(await zip.hasEntry('a.txt'), true);
    assert.equal(new TextDecoder().decode(await zip.readEntry('a.txt')), 'hello');
    assert.ok(commands.some(command => command.startsWith('dd if=')));
    assert.ok(commands.filter(command => command.startsWith('dd if=')).length >= 3);
});

test('metadata cache is shared per device, keyed by package, path and version, and survives lease release', async () => {
    const otherPath = '/data/app/other-hash/base.apk';
    const { adb, commands } = fakeAdb({
        [app.sourceDir]: iconApk(),
        [otherPath]: iconApk({ arsc: buildArsc({ appName: '另一应用' }) }),
    });
    const [one, two] = await Promise.all([acquireAppMetadata(adb), acquireAppMetadata(adb)]);
    const first = await one.request(app);
    const reads = commands.length;
    assert.deepEqual(await two.request(app), first);
    assert.equal(commands.length, reads);
    await one.release();
    assert.deepEqual(await two.request(app), first);
    assert.equal(commands.length, reads);
    await two.release();
    // A fresh lease reuses the device cache instead of re-reading untouched APKs.
    const next = await acquireAppMetadata(adb);
    assert.deepEqual(await next.request(app), first);
    assert.equal(commands.length, reads);
    assert.equal((await next.request({ ...app, versionCode: 2 })).versionCode, 42);
    assert.ok(commands.length > reads);
    const afterVersion = commands.length;
    assert.equal((await next.request({ ...app, sourceDir: otherPath })).appName, '另一应用');
    assert.ok(commands.length > afterVersion);
    await next.release();
});

test('metadata requests reject invalid targets, cancellation and timeouts promptly', async () => {
    const lease = await acquireAppMetadata(fakeAdb({}).adb);
    await assert.rejects(lease.request({ ...app, packageName: 'bad;id' }), /包名/);
    await assert.rejects(lease.request({ ...app, sourceDir: '/data/app/../base.apk' }), /路径/);
    const controller = new AbortController();
    const pending = lease.request(app, controller.signal);
    controller.abort(new Error('cancelled'));
    await assert.rejects(pending, /cancelled/);
    await lease.release();

    const hanging = await acquireAppMetadata(hangingAdb(), { timeout: 20 });
    await assert.rejects(hanging.request(app), /超时/);
    await hanging.release();

    const stopped = new AbortController();
    stopped.abort(new Error('already stopped'));
    await assert.rejects(acquireAppMetadata(fakeAdb({}).adb, { signal: stopped.signal }), /already stopped/);
});

test('unreadable APKs fail with a readable error and the lease can be released', async () => {
    const { adb } = fakeAdb({ [app.sourceDir]: new Uint8Array(64) });
    const lease = await acquireAppMetadata(adb);
    await assert.rejects(lease.request(app), /读取应用清单失败/);
    await lease.release();
});

function apk(name = 'base.apk') {
    const file = new Blob([new Uint8Array([1, 2, 3])]);
    file.name = name;
    return file;
}
function sessionMock(failAt) {
    const calls = [];
    return {
        calls,
        async sessionCreate() { calls.push('create'); if (failAt === 'create') throw new Error('create failed'); return 42; },
        async sessionAddSplitStream(id, name, size, stream) {
            assert.equal(id, 42);
            assert.match(name, /^part_\d+\.apk$/);
            calls.push(name);
            if (failAt === 'write') throw new Error('write failed');
            const reader = stream.getReader();
            let bytes = 0;
            for (;;) { const { value, done } = await reader.read(); if (done) break; bytes += value.byteLength; }
            assert.equal(bytes, size);
        },
        async sessionCommit(id) { assert.equal(id, 42); calls.push('commit'); if (failAt === 'commit') throw new Error('commit failed'); },
        async sessionAbandon(id) { assert.equal(id, 42); calls.push('abandon'); },
    };
}

test('single APK and split install stream, report progress and consume committed session', async () => {
    for (const files of [[apk()], [apk(), apk("split';id.apk")]]) {
        const pm = sessionMock();
        const states = [];
        await installApks({}, files, { packageManager: pm, onProgress: state => states.push(state) });
        assert.deepEqual(pm.calls, ['create', ...files.map((_, index) => `part_${index}.apk`), 'commit']);
        assert.equal(states.at(-1).phase, '安装完成');
        assert.equal(states.at(-1).loaded, files.length * 3);
    }
});

test('failed create/write/commit and cancellation clean up exactly the uncommitted session', async () => {
    for (const failAt of ['create', 'write', 'commit']) {
        const pm = sessionMock(failAt);
        await assert.rejects(installApks({}, [apk()], { packageManager: pm }), new RegExp(`${failAt} failed`));
        assert.equal(pm.calls.filter(call => call === 'abandon').length, failAt === 'create' ? 0 : 1);
    }
    const pm = sessionMock();
    const controller = new AbortController();
    await assert.rejects(installApks({}, [apk()], { packageManager: pm, signal: controller.signal, onProgress: () => controller.abort(new Error('cancelled')) }), /cancelled/);
    assert.equal(pm.calls.at(-1), 'abandon');
    assert.ok(!pm.calls.includes('commit'));
    const badCleanup = sessionMock('write');
    badCleanup.sessionAbandon = async () => { throw new Error('offline'); };
    await assert.rejects(installApks({}, [apk()], { packageManager: badCleanup }), /write failed.*42.*offline/);
});

test('invalid install selection never opens a session', async () => {
    const pm = sessionMock();
    for (const files of [[], [apk('bad.zip')], [{ name: 'empty.apk', size: 0 }]]) {
        await assert.rejects(installApks({}, files, { packageManager: pm }), /APK/);
    }
    assert.deepEqual(pm.calls, []);
});

test('shell actions validate status, failure text, legacy status marker and package names', async () => {
    const adb = commandAdb('Events injected: 1\n__APP_EXIT_0\n');
    await performAppAction(adb, app.packageName, 'launch');
    assert.match(adb.command, /'monkey' '-p' 'com.example.app'/);
    assert.equal(adb.killed, 1);
    await assert.rejects(performAppAction(adb, 'bad;id', 'stop'), /包名/);
    for (const output of ['Failure [BLOCKED]\n__APP_EXIT_0\n', 'Error: not found\n__APP_EXIT_0\n', '\n__APP_EXIT_1\n', 'missing marker']) {
        const failed = commandAdb(output);
        await assert.rejects(runAppCommand(failed, ['pm', 'test']));
        assert.equal(failed.killed, 1);
    }
    await assert.rejects(runAppCommand(commandAdb('\n__APP_EXIT_0\n', { exit: 1 }), ['true']));
    const legacy = commandAdb('Package com.example.app new state: disabled-user\n__APP_EXIT_0\n', { legacy: true });
    await performAppAction(legacy, app.packageName, 'disable');
    await assert.rejects(performAppAction(commandAdb('\n__APP_EXIT_0\n'), app.packageName, 'enable'), /未确认/);
    assert.equal(await performAppAction(commandAdb('details\n__APP_EXIT_0\n'), app.packageName, 'details'), 'details');
});

test('uninstall removes data and propagates PackageManager failure', async () => {
    let called = false;
    await uninstallApp({}, app.packageName, { packageManager: { async uninstall(pkg, options) { called = true; assert.equal(pkg, app.packageName); assert.equal(options.keepData, false); } } });
    assert.equal(called, true);
    await assert.rejects(uninstallApp({}, app.packageName, { packageManager: { async uninstall() { throw new Error('DELETE_FAILED'); } } }), /DELETE_FAILED/);
});

function exportMock(paths, fail = false) {
    const reads = [];
    let disposed = 0;
    return {
        adb: { sync: async () => ({ read(path) { reads.push(path); if (fail) throw new Error('read failed'); return textStream(path); }, dispose() { disposed++; } }) },
        pm: { getPackageSources: async () => paths },
        reads,
        get disposed() { return disposed; },
    };
}

test('single export is APK; split ZIP contains every source with safe unique names', async () => {
    const single = exportMock([app.sourceDir]);
    const result = await exportAppApks(single.adb, app.packageName, { packageManager: single.pm });
    assert.equal(result.filename, 'com.example.app.apk');
    assert.equal(await result.blob.text(), app.sourceDir);
    assert.equal(single.disposed, 1);
    const paths = [app.sourceDir, '/data/app/one/split.apk', '/data/app/two/split.apk'];
    const multiple = exportMock(paths);
    const entries = [];
    let closed = 0;
    const zipModule = {
        BlobWriter: class {},
        BlobReader: class { constructor(blob) { this.blob = blob; } },
        ZipWriter: class {
            async add(name, reader) { entries.push([name, await reader.blob.text()]); }
            async close() { closed++; return new Blob(['zip']); }
        },
    };
    const zip = await exportAppApks(multiple.adb, app.packageName, { packageManager: multiple.pm, zipModule });
    assert.equal(zip.filename, 'com.example.app-apks.zip');
    assert.deepEqual(entries.map(entry => entry[1]), paths);
    assert.equal(new Set(entries.map(entry => entry[0])).size, 3);
    assert.equal(closed, 1);
    assert.equal(multiple.disposed, 1);
});

test('real zip.js archive can be read back with every split APK intact', async () => {
    const { ZipReader, BlobReader } = await import('@zip.js/zip.js');
    const paths = [app.sourceDir, '/data/app/second/split_config.apk'];
    const mock = exportMock(paths);
    const { blob } = await exportAppApks(mock.adb, app.packageName, { packageManager: mock.pm });
    const reader = new ZipReader(new BlobReader(blob));
    try {
        const entries = await reader.getEntries();
        assert.deepEqual(entries.map(entry => entry.filename), ['0_base.apk', '1_split_config.apk']);
        assert.deepEqual(entries.map(entry => entry.uncompressedSize), paths.map(path => encoder.encode(path).byteLength));
    } finally { await reader.close(); }
    assert.equal(mock.disposed, 1);
});

test('export read/ZIP failures and cancellation dispose sync resources', async () => {
    const failed = exportMock([app.sourceDir], true);
    await assert.rejects(exportAppApks(failed.adb, app.packageName, { packageManager: failed.pm }), /read failed/);
    assert.equal(failed.disposed, 1);
    const controller = new AbortController();
    const cancelled = exportMock([app.sourceDir]);
    await assert.rejects(exportAppApks(cancelled.adb, app.packageName, { packageManager: cancelled.pm, signal: controller.signal, onProgress: () => controller.abort(new Error('cancelled')) }), /cancelled/);
    assert.equal(cancelled.disposed, 1);
    const split = exportMock([app.sourceDir, '/data/app/split.apk']);
    let closed = 0;
    const zipModule = { BlobWriter: class {}, BlobReader: class {}, ZipWriter: class { async add() { throw new Error('ZIP failed'); } async close() { closed++; } } };
    await assert.rejects(exportAppApks(split.adb, app.packageName, { packageManager: split.pm, zipModule }), /ZIP failed/);
    assert.equal(closed, 1);
    assert.equal(split.disposed, 1);
    const invalid = exportMock(['/data/app/base.apk\rattack']);
    await assert.rejects(exportAppApks(invalid.adb, app.packageName, { packageManager: invalid.pm }), /路径/);
    assert.deepEqual(invalid.reads, []);
});
