import test from 'node:test';
import assert from 'node:assert/strict';
import { AndroidKeyCode, AndroidKeyEventMeta, DefaultServerPath } from '@yume-chan/scrcpy';
import { AdbScrcpyOptions3_3_3 } from '@yume-chan/adb-scrcpy';
import { DEFAULT_SETTINGS, normalizeScrcpySettings } from '../src/utils/scrcpySettings.js';
import { keyboardMessage, mapVideoPosition } from '../src/pages/scrcpyShow/ScrcpyInput.js';
import { fetchServerBinary, pushServerToAdb } from '../src/utils/adbUtils.js';

test('settings use explicit 3.3.3 and forward tunnel with validated user choices', () => {
    const settings = normalizeScrcpySettings({ maxSize: 0, maxFps: 120, videoBitRate: 12000000, videoCodec: 'h265', audio: true, control: false, tunnelForward: false });
    const options = new AdbScrcpyOptions3_3_3(settings);
    assert.equal(options.version, '3.3.3');
    assert.equal(options.value.tunnelForward, true);
    assert.equal(options.value.control, true);
    assert.equal(options.value.audioCodec, 'aac');
    assert.ok(options.serialize().includes('video_codec=h265'));
    assert.equal(settings.maxSize, 0);
    for (const value of [{ maxSize: NaN }, { maxFps: 0 }, { videoBitRate: -1 }, { videoCodec: 'fake' }]) {
        assert.throws(() => normalizeScrcpySettings(value));
    }
    assert.equal(normalizeScrcpySettings().maxSize, DEFAULT_SETTINGS.maxSize);
});

test('coordinates use current video dimensions, including landscape and clamped edges', () => {
    const rect = { left: 10, top: 20, width: 960, height: 540 };
    assert.deepEqual(mapVideoPosition(490, 290, rect, 1920, 1080), { x: 960, y: 540 });
    assert.deepEqual(mapVideoPosition(9999, -100, rect, 1920, 1080), { x: 1919, y: 0 });
    assert.equal(mapVideoPosition(0, 0, rect, 0, 0), undefined);
    assert.equal(mapVideoPosition(0, 0, { width: 0, height: 0 }, 1080, 1920), undefined);
});

test('keyboard preserves modifiers while leaving editors, IME and browser shortcuts alone', () => {
    const event = { code: 'KeyA', shiftKey: true, ctrlKey: true, getModifierState: (name) => name === 'CapsLock' };
    assert.deepEqual(keyboardMessage(event), { keyCode: AndroidKeyCode.KeyA, metaState: AndroidKeyEventMeta.Shift | AndroidKeyEventMeta.Ctrl | AndroidKeyEventMeta.CapsLock, repeat: 0 });
    for (const item of [{ code: 'Escape' }, { code: 'F5' }, { code: 'KeyR', ctrlKey: true }, { code: 'KeyV', ctrlKey: true }, { code: 'KeyA', metaKey: true }, { code: 'KeyA', isComposing: true }, { code: 'KeyA', target: { closest: () => ({}) } }]) {
        assert.equal(keyboardMessage(item), undefined);
    }
});

test('server downloads reject HTTP errors and empty bodies', async (t) => {
    const fetch = globalThis.fetch;
    t.after(() => { globalThis.fetch = fetch; });
    globalThis.fetch = async () => ({ ok: false, status: 404 });
    await assert.rejects(fetchServerBinary('/server.bin'), /HTTP 404/);
    globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
    await assert.rejects(fetchServerBinary('/server.bin'), /文件为空/);
    globalThis.fetch = async () => ({ ok: true, headers: new Headers({ 'content-type': 'text/html' }) });
    await assert.rejects(fetchServerBinary('/server.bin'), /返回了 HTML/);
});

test('scrcpy server uses sync.write and always disposes, including write failures', async () => {
    let disposed = 0;
    let written;
    const adb = { sync: async () => ({
        write: async (options) => { written = options; },
        dispose: async () => { disposed++; },
    }) };
    await pushServerToAdb(adb, new Uint8Array([1, 2]).buffer);
    assert.equal(written.filename, DefaultServerPath);
    assert.equal(written.permission, 0o644);
    assert.ok(written.mtime < 10000000000);
    assert.equal(disposed, 1);
    const chunks = [];
    for await (const chunk of written.file) chunks.push(...chunk);
    assert.deepEqual(chunks, [1, 2]);
    adb.sync = async () => ({ write: async () => { throw new Error('write failed'); }, dispose: async () => { disposed++; } });
    await assert.rejects(pushServerToAdb(adb, new ArrayBuffer(1)), /write failed/);
    assert.equal(disposed, 2);
});

test('aborted uploads do not open a sync session', async () => {
    const abort = new AbortController();
    abort.abort();
    await assert.rejects(pushServerToAdb({ sync() { assert.fail('must not open sync'); } }, new ArrayBuffer(1), abort.signal), { name: 'AbortError' });
});
