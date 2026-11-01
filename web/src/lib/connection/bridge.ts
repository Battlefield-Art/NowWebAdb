import { AdbServerClient } from '@yume-chan/adb';
import {
  Consumable,
  ReadableStream,
  WritableStream,
  type MaybeConsumable,
  type ReadableStreamDefaultController,
} from '@yume-chan/stream-extra';
import { t } from '@/lib/i18n';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
const SOCKET_CHUNK = 64 * 1024;
const WRITE_BUFFER_LIMIT = 1024 * 1024;
const CONNECT_TIMEOUT = 10000;

export function validateBridgeUrl(value: string, pageProtocol = globalThis.location?.protocol): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(t('home.bridge.error.invalidUrl'));
  }
  if (!['ws:', 'wss:'].includes(url.protocol) || url.username || url.password || url.hash || url.search) {
    throw new Error(t('home.bridge.error.urlProtocol'));
  }
  if (pageProtocol === 'https:' && url.protocol !== 'wss:') {
    throw new Error(t('home.bridge.error.httpsWss'));
  }
  if (url.protocol === 'ws:' && !LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(t('home.bridge.error.wssRequired'));
  }
  return url.href;
}

export function validateWirelessAddress(value: string): string {
  const match = value.trim().match(/^(\[[0-9a-fA-F:]+\]|[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?):(\d{1,5})$/);
  const port = Number(match?.[2]);
  if (!match || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(t('home.bridge.error.invalidAddress'));
  }
  return `${match[1]}:${port}`;
}

export function isWirelessAddress(value: string): boolean {
  try {
    validateWirelessAddress(value);
    return true;
  } catch {
    return false;
  }
}

export function validateBridgeToken(value: string): string {
  if (!TOKEN_PATTERN.test(value)) throw new Error(t('home.bridge.error.invalidToken'));
  return value;
}

function validateBridgeConfig(url: string, token: string, pageProtocol?: string): { url: string; token: string } {
  return { url: validateBridgeUrl(url, pageProtocol), token: validateBridgeToken(token) };
}

export class AdbServerWebSocketConnector implements AdbServerClient.ServerConnector {
  private readonly url: string;
  private token: string;
  private readonly sockets = new Set<WebSocket>();
  private disposed = false;

  constructor(url: string, token: string, pageProtocol?: string) {
    const config = validateBridgeConfig(url, token, pageProtocol);
    this.url = config.url;
    this.token = config.token;
  }

  connect(options: AdbServerClient.ServerConnectionOptions = {}): Promise<AdbServerClient.ServerConnection> {
    if (this.disposed) return Promise.reject(new Error(t('home.bridge.error.closed')));
    const { signal } = options;
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(signal.reason ?? new Error(t('home.bridge.error.cancelled')));
        return;
      }
      const socket = new WebSocket(this.url, ['nowwebadb', `token.${this.token}`]);
      socket.binaryType = 'arraybuffer';
      this.sockets.add(socket);
      let opened = false;
      let ended = false;
      let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
      let resolveClosed: () => void = () => {};
      const closed = new Promise<undefined>(resolveClose => {
        resolveClosed = () => resolveClose(undefined);
      });
      const close = (): void => {
        if (socket.readyState < WebSocket.CLOSING) socket.close();
      };
      const cleanup = (): void => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
      };
      const fail = (error: Error): void => {
        if (ended) return;
        ended = true;
        cleanup();
        if (opened) controller?.error(error);
        else reject(error);
        close();
      };
      const abort = (): void => fail((signal?.reason as Error | undefined) ?? new DOMException(t('home.bridge.error.cancelled'), 'AbortError'));
      const timer = setTimeout(
        () => fail(new Error(t('home.bridge.error.timeout'))),
        CONNECT_TIMEOUT,
      );
      signal?.addEventListener('abort', abort);
      socket.onmessage = event => {
        if (ended || !controller) return;
        if (!(event.data instanceof ArrayBuffer)) {
          fail(new Error(t('home.bridge.error.notBinary')));
          return;
        }
        if ((controller.desiredSize ?? 0) <= 0) {
          fail(new Error(t('home.bridge.error.queueFull')));
          return;
        }
        controller.enqueue(new Uint8Array(event.data));
      };
      socket.onerror = () => fail(new Error(t('home.bridge.error.unreachable')));
      socket.onclose = event => {
        cleanup();
        this.sockets.delete(socket);
        if (!ended) {
          ended = true;
          if (!opened) reject(new Error(t('home.bridge.error.closedBeforeOpen')));
          else if (event.code === 1000 || event.code === 1005) controller?.close();
          else controller?.error(new Error(event.reason || t('home.bridge.error.unexpectedClose')));
        }
        resolveClosed();
      };
      socket.onopen = () => {
        if (ended) {
          close();
          return;
        }
        clearTimeout(timer);
        opened = true;
        const readable = new ReadableStream<Uint8Array>(
          {
            start(value) {
              controller = value;
            },
            cancel() {
              ended = true;
              close();
            },
          },
          { highWaterMark: 16 * 1024 * 1024, size: chunk => chunk.byteLength },
        );
        const writable = new WritableStream<MaybeConsumable<Uint8Array>>({
          async write(chunk) {
            const send = async (data: Uint8Array): Promise<void> => {
              for (let offset = 0; offset < data.length; offset += SOCKET_CHUNK) {
                while (socket.bufferedAmount > WRITE_BUFFER_LIMIT && !ended) {
                  await new Promise(resolveDelay => setTimeout(resolveDelay, 8));
                }
                if (ended || socket.readyState !== WebSocket.OPEN) throw new Error(t('home.bridge.error.alreadyClosed'));
                socket.send(data.subarray(offset, offset + SOCKET_CHUNK));
              }
            };
            await (chunk instanceof Consumable ? chunk.tryConsume(send) : send(chunk));
          },
          close,
          abort: close,
        });
        resolve({
          readable,
          writable,
          get closed() {
            return closed;
          },
          close,
        });
      };
    });
  }

  addReverseTunnel(): never {
    throw new Error(t('home.bridge.error.reverseTunnel'));
  }

  removeReverseTunnel(): void {}

  clearReverseTunnels(): void {}

  close(): void {
    this.disposed = true;
    this.token = '';
    for (const socket of this.sockets) socket.close();
    this.sockets.clear();
  }
}

const bridgeClients = new WeakMap<AdbServerClient, AdbServerWebSocketConnector>();

export function createBridgeClient(url: string, token: string, pageProtocol?: string): AdbServerClient {
  const connector = new AdbServerWebSocketConnector(url, token, pageProtocol);
  const client = new AdbServerClient(connector);
  bridgeClients.set(client, connector);
  return client;
}

export function closeBridgeClient(client: AdbServerClient): void {
  bridgeClients.get(client)?.close();
  bridgeClients.delete(client);
}
