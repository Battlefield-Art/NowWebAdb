import { Consumable, ReadableStream, WritableStream } from '@yume-chan/stream-extra';

export function validateBridgeUrl(value, pageProtocol = globalThis.location?.protocol) {
    const url = new URL(value);
    if (!['ws:', 'wss:'].includes(url.protocol) || url.username || url.password || url.hash || url.search) {
        throw new Error('桥接地址必须是无用户名、密码和查询参数的 ws:// 或 wss:// 地址');
    }
    if (pageProtocol === 'https:' && url.protocol !== 'wss:') throw new Error('HTTPS 页面请使用 WSS；本地开发使用下方同源代理地址');
    if (url.protocol === 'ws:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
        throw new Error('非本机桥接必须使用 WSS 加密');
    }
    return url.href;
}

export function validateWirelessAddress(value) {
    const match = value.trim().match(/^(\[[0-9a-fA-F:]+\]|[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?):(\d{1,5})$/);
    if (!match || Number(match[2]) < 1 || Number(match[2]) > 65535) throw new Error('请输入设备的 IP:端口（IPv6 使用 [地址]:端口）');
    return `${match[1]}:${Number(match[2])}`;
}

export class AdbServerWebSocketConnector {
    constructor(url, token) {
        this.url = validateBridgeUrl(url);
        if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) throw new Error('请输入本地桥接终端显示的会话令牌');
        this.token = token;
        this.connections = new Set();
        this.disposed = false;
    }

    connect({ signal } = {}) {
        if (this.disposed) return Promise.reject(new Error('桥接连接已关闭'));
        return new Promise((resolve, reject) => {
            signal?.throwIfAborted();
            const socket = new WebSocket(this.url, ['nowwebadb', `token.${this.token}`]);
            socket.binaryType = 'arraybuffer';
            this.connections.add(socket);
            let opened = false;
            let ended = false;
            let controller;
            let resolveClosed;
            const closed = new Promise(resolve => { resolveClosed = resolve; });
            const close = () => {
                if (socket.readyState < WebSocket.CLOSING) socket.close();
            };
            const fail = error => {
                if (ended) return;
                ended = true;
                clearTimeout(timer);
                if (opened) controller.error(error);
                else reject(error);
                close();
            };
            const abort = () => fail(signal.reason || new DOMException('已取消连接', 'AbortError'));
            const timer = setTimeout(() => fail(new Error('桥接连接超时，请检查桥接程序、证书、来源白名单和令牌')), 10000);
            signal?.addEventListener('abort', abort, { once: true });
            socket.onmessage = event => {
                if (ended) return;
                if (!(event.data instanceof ArrayBuffer)) return fail(new Error('桥接返回了非二进制数据'));
                if (controller.desiredSize <= 0) return fail(new Error('桥接接收队列已满，已断开以避免内存耗尽'));
                controller.enqueue(new Uint8Array(event.data));
            };
            socket.onerror = () => fail(new Error('无法访问 ADB 桥接，请检查程序是否启动、令牌和允许来源是否正确'));
            socket.onclose = event => {
                clearTimeout(timer);
                signal?.removeEventListener('abort', abort);
                this.connections.delete(socket);
                if (!ended) {
                    ended = true;
                    if (!opened) reject(new Error('ADB 桥接在连接建立前关闭'));
                    else if (event.code === 1000 || event.code === 1005) controller.close();
                    else controller.error(new Error(event.reason || 'ADB 桥接意外断开'));
                }
                resolveClosed();
            };
            socket.onopen = () => {
                if (ended) return close();
                clearTimeout(timer);
                opened = true;
                const readable = new ReadableStream({
                    start(value) { controller = value; },
                    cancel() { ended = true; close(); },
                }, { highWaterMark: 16 * 1024 * 1024, size: chunk => chunk.byteLength });
                const writable = new WritableStream({
                    async write(chunk) {
                        const send = async data => {
                            for (let offset = 0; offset < data.length; offset += 65536) {
                                while (socket.bufferedAmount > 1024 * 1024 && !ended) {
                                    await new Promise(resolve => setTimeout(resolve, 8));
                                }
                                if (ended || socket.readyState !== WebSocket.OPEN) throw new Error('ADB 桥接连接已关闭');
                                socket.send(data.subarray(offset, offset + 65536));
                            }
                        };
                        return chunk instanceof Consumable ? chunk.tryConsume(send) : send(chunk);
                    },
                    close,
                    abort: close,
                });
                resolve({ readable, writable, closed, close });
            };
        });
    }

    addReverseTunnel() { throw new Error('WebSocket 桥接不支持反向隧道，请使用 tunnelForward'); }
    removeReverseTunnel() {}
    clearReverseTunnels() {}
    close() {
        this.disposed = true;
        this.token = '';
        for (const socket of this.connections) socket.close();
        this.connections.clear();
    }
}
