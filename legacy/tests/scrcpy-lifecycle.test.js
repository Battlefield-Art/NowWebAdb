import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const bundle = await build({
    entryPoints: [fileURLToPath(new URL('../src/pages/scrcpyShow/ScrcpyLogic.js', import.meta.url))],
    absWorkingDir: root,
    bundle: true, write: false, platform: 'node', format: 'esm',
    plugins: [{ name: 'scrcpy-test-adapters', setup(builder) {
        const stubs = {
            '@/utils/adbManager.js': 'export const getAdbInstance = () => globalThis.__scrcpyTest.adb;',
            '@/utils/adbUtils.js': 'export const pushServerAndStartScrcpyClient = (...args) => globalThis.__scrcpyTest.upload(...args);',
            '@yume-chan/adb-scrcpy': `export const AdbScrcpyClient = { start: (...args) => globalThis.__scrcpyTest.start(...args) }; export class AdbScrcpyOptions3_3_3 { constructor(value, extra) { this.value = value; this.spawner = extra.spawner; this.version = '3.3.3'; } }`,
            '@yume-chan/scrcpy-decoder-webcodecs': 'export class WebCodecsVideoDecoder { static isSupported = true; constructor(options) { return new globalThis.__scrcpyTest.Decoder(options); } } export class WebGLVideoFrameRenderer { constructor(canvas) { this.canvas = canvas; } async draw() {} }',
        };
        builder.onResolve({ filter: /.*/ }, (args) => {
            if (stubs[args.path]) return { path: args.path, namespace: 'scrcpy-stub' };
            if (args.path === '@/utils/scrcpySettings.js') return { path: fileURLToPath(new URL('../src/utils/scrcpySettings.js', import.meta.url)) };
        });
        builder.onLoad({ filter: /.*/, namespace: 'scrcpy-stub' }, (args) => ({ contents: stubs[args.path], loader: 'js' }));
    } }],
});
const { useScrcpy } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => { let resolve; let reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

function fixture(t) {
    const document = globalThis.document;
    const calls = [];
    const exited = deferred();
    let closeCount = 0;
    let killCount = 0;
    let decoderDisposed = 0;
    let videoController;
    let outputController;
    let clipboardController;
    let sizeHandler;
    const container = { children: [], appendChild(canvas) { this.children.push(canvas); } };
    globalThis.document = { createElement: () => ({
        remove() { container.children = container.children.filter((item) => item !== this); },
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
    }) };
    const client = {
        exited: exited.promise,
        videoStream: Promise.resolve({ metadata: { codec: 1 }, stream: new ReadableStream({ start(c) { videoController = c; } }) }),
        output: new ReadableStream({ start(c) { outputController = c; } }),
        clipboard: new ReadableStream({ start(c) { clipboardController = c; } }),
        controller: Object.fromEntries(['injectKeyCode', 'injectTouch', 'injectScroll', 'setClipboard', 'rotateDevice', 'expandNotificationPanel', 'setScreenPowerMode'].map((name) => [name, async (...args) => { calls.push([name, ...args]); }])),
        close: async () => { closeCount++; exited.resolve(); },
    };
    const process = { kill: async () => { killCount++; exited.resolve(); } };
    globalThis.__scrcpyTest = {
        adb: { subprocess: { noneProtocol: { spawn: async () => process } } },
        upload: async () => {},
        start: async (_adb, _path, options) => { await options.spawner.spawn([]); return client; },
        Decoder: class {
            constructor({ renderer }) {
                this.renderer = renderer;
                this.writable = new WritableStream({ write: async (packet) => {
                    if (packet.fail) throw new Error('decoder failed');
                    sizeHandler?.({ width: 1920, height: 1080 });
                    await renderer.draw({});
                } });
            }
            sizeChanged(handler) { sizeHandler = handler; return { dispose() { sizeHandler = undefined; } }; }
            dispose() { decoderDisposed++; }
        },
    };
    const logic = useScrcpy();
    t.after(async () => { await logic.destroyClient(); globalThis.document = document; delete globalThis.__scrcpyTest; });
    return { logic, client, container, calls, video: () => videoController, output: () => outputController, clipboard: () => clipboardController, stats: () => ({ closeCount, killCount, decoderDisposed }) };
}

test('first frame establishes reactive readiness; real controls send exact API messages', async (t) => {
    const f = fixture(t);
    await f.logic.scrcpyStart(f.container);
    assert.equal(f.logic.connectionStatus.value, 'connecting');
    assert.equal(f.logic.client.value, f.client);
    f.video().enqueue({});
    await tick();
    assert.equal(f.logic.ready.value, true);
    assert.equal(f.logic.width.value, 1920);
    await f.logic.pressKey(null, 'AndroidHome');
    await f.logic.sendClipboard('中文 café');
    await f.logic.rotateDevice();
    await f.logic.expandNotifications();
    await f.logic.setScreenPower(false);
    assert.deepEqual(f.calls.slice(0, 2).map((call) => call[1].action), [0, 1]);
    assert.deepEqual(f.calls[2], ['setClipboard', { content: '中文 café', paste: true, sequence: 0n }]);
    assert.equal(f.calls[3][0], 'rotateDevice');
    assert.equal(f.calls[4][0], 'expandNotificationPanel');
    assert.deepEqual(f.calls[5], ['setScreenPowerMode', 0]);
    f.clipboard().enqueue('device text');
    await tick();
    assert.equal(f.logic.deviceClipboard.value, 'device text');
    await f.logic.destroyClient();
    assert.equal(f.logic.ready.value, false);
    assert.equal(f.container.children.length, 0);
    assert.equal(f.stats().closeCount, 1);
    assert.equal(f.stats().decoderDisposed, 1);
});

test('touch uses video coordinates and releases capture; wheel is bounded', async (t) => {
    const f = fixture(t);
    await f.logic.scrcpyStart(f.container);
    f.video().enqueue({});
    await tick();
    let captured = false;
    const target = { focus() {}, setPointerCapture() { captured = true; }, hasPointerCapture: () => captured, releasePointerCapture() { captured = false; } };
    const event = { button: 0, pointerId: 3, clientX: 480, clientY: 270, currentTarget: target, preventDefault() {} };
    f.logic.handlePointerDown(event);
    f.logic.handlePointerMove({ ...event, clientX: 10000 });
    f.logic.handlePointerUp(event);
    f.logic.handleWheel({ ...event, deltaX: 0, deltaY: 9999, deltaMode: 1 });
    await tick();
    assert.equal(captured, false);
    assert.deepEqual(f.calls.slice(0, 3).map((call) => call[1].action), [0, 2, 1]);
    assert.equal(f.calls[0][1].pointerX, 960);
    assert.equal(f.calls[0][1].videoWidth, 1920);
    assert.equal(f.calls[1][1].pointerX, 1919);
    assert.equal(f.calls[2][1].pressure, 0);
    assert.equal(f.calls[3][1].scrollY, -1);
});

test('audio is drained even without browser audio support', async (t) => {
    const f = fixture(t);
    let pulls = 0;
    f.client.audioStream = Promise.resolve({ type: 'success', codec: { optionValue: 'aac' }, stream: new ReadableStream({
        pull(controller) { if (++pulls < 5) controller.enqueue({ type: 'data', data: new Uint8Array(1) }); else controller.close(); },
    }) });
    await f.logic.scrcpyStart(f.container, { audio: true });
    f.video().enqueue({});
    await tick();
    assert.equal(pulls, 5);
    assert.equal(f.logic.ready.value, true);
});

test('audio metadata rejection is observed without hiding working video', async (t) => {
    const f = fixture(t);
    f.client.audioStream = Promise.reject(new Error('audio metadata failed'));
    await f.logic.scrcpyStart(f.container, { audio: true });
    f.video().enqueue({});
    await tick();
    assert.equal(f.logic.ready.value, true);
    assert.match(f.logic.audioStatus.value, /audio metadata failed/);
});

test('decoder errors become visible and tear down the client', async (t) => {
    const f = fixture(t);
    await f.logic.scrcpyStart(f.container);
    f.video().enqueue({ fail: true });
    await tick();
    assert.equal(f.logic.connectionStatus.value, 'error');
    assert.match(f.logic.connectionError.value, /decoder failed/);
    assert.equal(f.logic.client.value, undefined);
    assert.equal(f.stats().closeCount, 1);
});

test('unmount during upload prevents any late startup', async (t) => {
    const f = fixture(t);
    const upload = deferred();
    let starts = 0;
    globalThis.__scrcpyTest.upload = () => upload.promise;
    globalThis.__scrcpyTest.start = async () => { starts++; return f.client; };
    const starting = f.logic.scrcpyStart(f.container);
    await tick();
    await f.logic.destroyClient();
    upload.resolve();
    await starting;
    assert.equal(starts, 0);
    assert.equal(f.logic.connectionStatus.value, 'idle');
});

test('a late client after teardown is closed, never published or rendered', async (t) => {
    const f = fixture(t);
    const start = deferred();
    globalThis.__scrcpyTest.start = async (_adb, _path, options) => { await options.spawner.spawn([]); return start.promise; };
    const starting = f.logic.scrcpyStart(f.container);
    await tick();
    await f.logic.destroyClient();
    start.resolve(f.client);
    await starting;
    await tick();
    assert.equal(f.stats().killCount, 1);
    assert.equal(f.stats().closeCount, 1);
    assert.equal(f.logic.client.value, undefined);
    assert.equal(f.logic.connectionStatus.value, 'idle');
    assert.equal(f.container.children.length, 0);
});

test('retry supersedes an older pending upload', async (t) => {
    const f = fixture(t);
    const upload = deferred();
    let uploads = 0;
    globalThis.__scrcpyTest.upload = () => ++uploads === 1 ? upload.promise : Promise.resolve();
    const oldStart = f.logic.scrcpyStart(f.container);
    await tick();
    await f.logic.scrcpyStart(f.container);
    f.video().enqueue({});
    await tick();
    upload.resolve();
    await oldStart;
    assert.equal(f.logic.ready.value, true);
    assert.equal(f.container.children.length, 1);
});

test('blur releases held keys; focused input fields are never intercepted', async (t) => {
    const f = fixture(t);
    await f.logic.scrcpyStart(f.container);
    f.video().enqueue({});
    await tick();
    let prevented = 0;
    f.logic.handleKeyEvent({ type: 'keydown', code: 'ShiftLeft', shiftKey: true, preventDefault() { prevented++; } });
    f.logic.releaseInput();
    await tick();
    assert.equal(prevented, 1);
    assert.deepEqual(f.calls.map((call) => call[1].action), [0, 1]);
    f.logic.handleKeyEvent({ type: 'keydown', code: 'KeyA', target: { closest: () => true }, preventDefault() { assert.fail('input intercepted'); } });
    assert.equal(f.calls.length, 2);
});
