import { DefaultServerPath } from '@yume-chan/scrcpy';
import { ReadableStream } from '@yume-chan/stream-extra';

export const fetchServerBinary = async (path, signal) => {
    const response = await fetch(new URL(path, import.meta.url), { signal });
    if (!response.ok) {
        throw new Error(`下载 ${path} 失败: HTTP ${response.status}`);
    }
    if (response.headers?.get('content-type')?.includes('text/html')) {
        throw new Error(`下载 ${path} 失败: 返回了 HTML，请检查服务端文件是否存在`);
    }
    const buffer = await response.arrayBuffer();
    if (!buffer.byteLength) throw new Error(`下载 ${path} 失败: 文件为空`);
    return buffer;
};

export const pushServerToAdb = async (adb, serverBuffer, signal) => {
    signal?.throwIfAborted();
    const sync = await adb.sync();
    let disposal;
    const dispose = () => (disposal ??= Promise.resolve().then(() => sync.dispose()));
    const abort = () => { void dispose().catch(() => {}); };
    signal?.addEventListener('abort', abort, { once: true });
    try {
        signal?.throwIfAborted();
        await sync.write({
            filename: DefaultServerPath,
            file: new ReadableStream({
                start(controller) {
                    controller.enqueue(new Uint8Array(serverBuffer));
                    controller.close();
                },
            }),
            permission: 0o644,
            mtime: Math.floor(Date.now() / 1000),
        });
        signal?.throwIfAborted();
    } finally {
        signal?.removeEventListener('abort', abort);
        await dispose();
    }
};

export const pushServerAndStartScrcpyClient = async (adb, serverPath, signal) => {
    const serverBuffer = await fetchServerBinary(serverPath, signal);
    await pushServerToAdb(adb, serverBuffer, signal);
};
