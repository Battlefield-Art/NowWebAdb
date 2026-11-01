import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { readFileSync } from 'node:fs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { WebSocketServer, createWebSocketStream } from 'ws';

export function authorizeBridge(request, { token, origins }) {
    if (!origins.has(request.headers.origin)) return false;
    if (request.url !== '/adb-bridge') return false;
    const protocols = (request.headers['sec-websocket-protocol'] || '').split(',').map(value => value.trim());
    const supplied = protocols.find(value => value.startsWith('token.'))?.slice(6) || '';
    const a = Buffer.from(supplied);
    const b = Buffer.from(token);
    return protocols.includes('nowwebadb') && a.length === b.length && timingSafeEqual(a, b);
}

export function createBridge({ token, origins, tcpPort = 5037, tls } = {}) {
    if (!token || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) throw new Error('桥接令牌必须是 32–128 位字母、数字、下划线或横线');
    const handler = (_request, response) => {
        response.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
        response.end('Not found');
    };
    const server = tls ? https.createServer(tls, handler) : http.createServer(handler);
    const sockets = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024, perMessageDeflate: false, handleProtocols: () => 'nowwebadb' });
    server.on('upgrade', (request, socket, head) => {
        if (!authorizeBridge(request, { token, origins }) || sockets.clients.size >= 64) {
            socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
            return;
        }
        sockets.handleUpgrade(request, socket, head, ws => sockets.emit('connection', ws));
    });
    sockets.on('connection', ws => {
        const tcp = net.connect({ host: '127.0.0.1', port: tcpPort });
        const stream = createWebSocketStream(ws);
        const timer = setTimeout(() => tcp.destroy(new Error('ADB Server connection timed out')), 5000);
        tcp.once('connect', () => clearTimeout(timer));
        tcp.once('close', () => { clearTimeout(timer); stream.destroy(); });
        tcp.on('error', () => { clearTimeout(timer); ws.close(1011, 'ADB Server unavailable; run adb start-server'); });
        stream.on('error', () => tcp.destroy());
        stream.once('close', () => tcp.destroy());
        tcp.pipe(stream).pipe(tcp);
    });
    return { server, sockets, close: async () => {
        for (const client of sockets.clients) client.terminate();
        sockets.close();
        await new Promise(resolve => server.close(resolve));
    } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const token = process.env.ADB_BRIDGE_TOKEN || randomBytes(32).toString('base64url');
    const origins = new Set((process.env.ADB_BRIDGE_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,https://localhost:5173,https://127.0.0.1:5173').split(',').map(value => new URL(value.trim()).origin));
    const port = Number(process.env.ADB_BRIDGE_PORT || 5858);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('无效桥接端口');
    const cert = process.env.ADB_BRIDGE_CERT;
    const key = process.env.ADB_BRIDGE_KEY;
    if (Boolean(cert) !== Boolean(key)) throw new Error('必须同时指定 ADB_BRIDGE_CERT 和 ADB_BRIDGE_KEY');
    const bridge = createBridge({ token, origins, tls: cert ? { cert: readFileSync(cert), key: readFileSync(key) } : undefined });
    bridge.server.listen(port, '127.0.0.1', () => {
        console.log(`ADB bridge: ${cert ? 'wss' : 'ws'}://127.0.0.1:${port}/adb-bridge`);
        console.log(`Allowed origins: ${[...origins].join(', ')}`);
        console.log(`Session token (paste into NowWebAdb): ${token}`);
        console.log('Run adb start-server first. Bridge forwards only to 127.0.0.1:5037. Do not share the token.');
    });
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => bridge.close().then(() => process.exit(0)));
}
