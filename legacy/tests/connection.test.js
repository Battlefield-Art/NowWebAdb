import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { WebSocket } from 'ws';
import { createBridge, authorizeBridge } from '../scripts/adb-bridge.mjs';
import { AdbServerWebSocketConnector, validateBridgeUrl, validateWirelessAddress } from '../src/utils/adbServerConnector.js';
import { Consumable } from '@yume-chan/stream-extra';
import { connectionState, setAdbInstance, getAdbInstance, disconnectDevice, executeCommand } from '../src/utils/adbManager.js';

const token = 'test-token-'.repeat(4);
const origin = 'http://localhost:5173';
const origins = new Set([origin]);
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const request = (changes = {}) => ({ url: '/adb-bridge', headers: { origin, 'sec-websocket-protocol': `nowwebadb, token.${token}`, ...changes } });

test('bridge authorization requires exact origin, path, protocol and token', () => {
    assert.equal(authorizeBridge(request(), { token, origins }), true);
    for (const change of [{ origin: 'https://malicious.invalid' }, { origin: undefined }, { 'sec-websocket-protocol': 'nowwebadb' }, { 'sec-websocket-protocol': `nowwebadb, token.${'wrong'.repeat(10)}` }]) {
        assert.equal(authorizeBridge(request(change), { token, origins }), false);
    }
    assert.equal(authorizeBridge({ ...request(), url: '/adb-bridge?target=other-host' }, { token, origins }), false);
});

test('bridge and wireless address validation rejects injection and insecure remote endpoints', () => {
    assert.equal(validateBridgeUrl('wss://localhost:5173/adb-bridge', 'https:'), 'wss://localhost:5173/adb-bridge');
    assert.equal(validateBridgeUrl('ws://127.0.0.1:5858/adb-bridge', 'http:'), 'ws://127.0.0.1:5858/adb-bridge');
    for (const url of ['https://localhost/', 'ws://remote.invalid/', 'wss://user:pass@remote.invalid/', 'wss://localhost/?token=secret', 'wss://localhost/#x']) assert.throws(() => validateBridgeUrl(url, 'http:'));
    assert.throws(() => validateBridgeUrl('ws://localhost:5858/', 'https:'));
    assert.equal(validateWirelessAddress('192.168.1.20:5555'), '192.168.1.20:5555');
    assert.equal(validateWirelessAddress('[::1]:5555'), '[::1]:5555');
    for (const address of ['host:0', 'host:65536', 'host:123;id', 'host', '-s:5555', 'host:22\nid', 'host/path:55']) assert.throws(() => validateWirelessAddress(address));
});

test('WebSocket bridge forwards binary TCP with consumable writes and rejects untrusted origins', async () => {
    const tcp = net.createServer(socket => socket.pipe(socket));
    const tcpPort = await listen(tcp);
    const bridge = createBridge({ token, origins, tcpPort });
    const port = await listen(bridge.server);
    const previous = globalThis.WebSocket;
    globalThis.WebSocket = class extends WebSocket {
        constructor(url, protocols) { super(url, protocols, { origin }); }
    };
    const connector = new AdbServerWebSocketConnector(`ws://127.0.0.1:${port}/adb-bridge`, token);
    try {
        const connection = await connector.connect();
        const writer = connection.writable.getWriter();
        const reader = connection.readable.getReader();
        const bytes = new Uint8Array(196613).map((_, i) => i % 251);
        const chunk = new Consumable(bytes);
        const write = writer.write(chunk);
        const received = [];
        let size = 0;
        while (size < bytes.length) { const { value, done } = await reader.read(); assert.equal(done, false); received.push(value); size += value.length; }
        await write;
        await chunk.consumed;
        assert.deepEqual(Buffer.concat(received), Buffer.from(bytes));
        await reader.cancel();
        writer.releaseLock();
        await connection.closed;
        await new Promise((resolve, reject) => {
            const rejected = new WebSocket(`ws://127.0.0.1:${port}/adb-bridge`, ['nowwebadb', `token.${token}`], { origin: 'http://untrusted.invalid' });
            rejected.on('open', () => { rejected.close(); reject(new Error('untrusted origin accepted')); });
            rejected.on('error', error => { assert.match(error.message, /403/); resolve(); });
        });
    } finally {
        connector.close();
        globalThis.WebSocket = previous;
        await bridge.close();
        await new Promise(resolve => tcp.close(resolve));
    }
});

test('cancelled and disposed connectors do not open sockets', async () => {
    const connector = new AdbServerWebSocketConnector('ws://localhost:5858/adb-bridge', token);
    const abort = new AbortController(); abort.abort();
    await assert.rejects(connector.connect({ signal: abort.signal }), { name: 'AbortError' });
    connector.close();
    await assert.rejects(connector.connect(), /已关闭/);
});

test('old disconnect cannot clear a newer session; explicit disconnect releases resources', async () => {
    let disconnectOld;
    let disconnectNew;
    let released = 0;
    const first = { serial: 'first', disconnected: new Promise(resolve => { disconnectOld = resolve; }), close: async () => {} };
    const second = { serial: 'second', disconnected: new Promise(resolve => { disconnectNew = resolve; }), close: async () => { disconnectNew(); } };
    setAdbInstance(first);
    setAdbInstance(second, { type: 'server', release: () => released++ });
    disconnectOld();
    await Promise.resolve();
    assert.equal(getAdbInstance(), second);
    assert.equal(connectionState.serial, 'second');
    await disconnectDevice();
    assert.equal(connectionState.adb, null);
    assert.equal(released, 1);
});

test('unexpected disconnect clears connection and preserves failure reason', async () => {
    let reject;
    const adb = { serial: 'offline', disconnected: new Promise((_, fail) => { reject = fail; }) };
    setAdbInstance(adb);
    reject(new Error('USB removed'));
    await Promise.resolve();
    assert.equal(getAdbInstance(), undefined);
    assert.equal(connectionState.error, 'USB removed');
});

test('executeCommand falls back to the merged output stream of the none protocol', async () => {
    const adb = {
        serial: 'legacy',
        disconnected: new Promise(() => {}),
        close: async () => {},
        subprocess: {
            shellProtocol: { isSupported: false },
            noneProtocol: {
                spawn: async () => ({
                    output: new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('legacy output')); controller.close(); } }),
                }),
            },
        },
    };
    setAdbInstance(adb);
    try {
        assert.equal(await executeCommand('echo legacy'), 'legacy output');
    } finally {
        await disconnectDevice();
    }
});
