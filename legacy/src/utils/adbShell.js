export function shellEscape(value) {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

export function aborted(signal) {
    if (signal?.aborted) throw signal.reason || new Error('操作已取消');
}

export function bounded(promise, timeout = 10000, signal) {
    return new Promise((resolve, reject) => {
        const abort = () => finish(reject, signal.reason || new Error('操作已取消'));
        const timer = setTimeout(() => finish(reject, new Error('操作超时')), timeout);
        function finish(callback, value) {
            clearTimeout(timer);
            signal?.removeEventListener('abort', abort);
            callback(value);
        }
        signal?.addEventListener('abort', abort, { once: true });
        Promise.resolve(promise).then(value => finish(resolve, value), error => finish(reject, error));
        if (signal?.aborted) abort();
    });
}

export async function readText(stream) {
    if (!stream) return '';
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';
    try {
        for (;;) {
            const { value, done } = await reader.read();
            if (done) return result + decoder.decode();
            result += decoder.decode(value, { stream: true });
            if (result.length > 8 * 1024 * 1024) throw new Error('命令输出过大');
        }
    } finally { reader.releaseLock(); }
}

function protocolFor(adb) {
    return adb.subprocess.shellProtocol?.isSupported ? adb.subprocess.shellProtocol : adb.subprocess.noneProtocol;
}

export async function runAppCommand(adb, args, { signal, timeout = 20000 } = {}) {
    aborted(signal);
    // A marker also provides a real exit status on devices without shell-v2.
    const command = `${args.map(shellEscape).join(' ')}; __app_status=$?; printf '\\n__APP_EXIT_%s\\n' "$__app_status"`;
    const process = await protocolFor(adb).spawn(command);
    try {
        const [stdout, stderr, exit] = await bounded(Promise.all([
            readText(process.stdout || process.output), readText(process.stderr), process.exited,
        ]), timeout, signal);
        const marker = stdout.match(/\n__APP_EXIT_(\d+)\s*$/);
        const output = stdout.replace(/\n__APP_EXIT_\d+\s*$/, '').trim();
        if (!marker || Number(marker[1]) !== 0 || (typeof exit === 'number' && exit !== 0) ||
            /(?:^|\n)\s*(?:Failure\b|Error\b|Exception\b|SecurityException\b|java\.[\w.]+Exception\b)|permission denied|not allowed|No activities found|monkey aborted/i.test(`${output}\n${stderr}`)) {
            throw new Error(output || stderr || '设备命令执行失败');
        }
        return output;
    } finally { await process.kill(); }
}

async function readRaw(stream, maxBytes, signal) {
    if (!stream) throw new Error('设备未返回数据');
    const reader = stream.getReader();
    const chunks = [];
    let total = 0;
    try {
        for (;;) {
            aborted(signal);
            const { value, done } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > maxBytes) throw new Error('APK 数据超过大小限制');
            chunks.push(value);
        }
    } finally {
        try { await reader.cancel(); } catch { /* already closed */ }
        try { reader.releaseLock(); } catch { /* released */ }
    }
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
    return result;
}

// Binary reads must bypass the status marker and must discard stderr, otherwise
// dd's statistics would corrupt the stream on devices without shell-v2.
export async function runBinaryCommand(adb, command, { signal, timeout = 30000, maxBytes = 32 * 1024 * 1024 } = {}) {
    aborted(signal);
    const process = await bounded(protocolFor(adb).spawn(command), timeout, signal);
    const stderr = readText(process.stderr).catch(() => {});
    try {
        const bytes = await bounded(readRaw(process.stdout || process.output, maxBytes, signal), timeout, signal);
        const exit = await bounded(Promise.resolve(process.exited), timeout, signal);
        if (typeof exit === 'number' && exit !== 0) throw new Error('读取设备文件失败');
        return bytes;
    } finally {
        try { await process.kill(); } catch { /* exited */ }
        void stderr;
    }
}

const READ_BLOCK = 65536;

export async function readRange(adb, path, start, length, { signal, timeout = 30000, maxBytes = 64 * 1024 * 1024 } = {}) {
    if (!Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(length) || length <= 0) {
        throw new Error('无效的读取范围');
    }
    if (length > maxBytes) throw new Error('APK 读取超出限制');
    const alignedStart = Math.floor(start / READ_BLOCK) * READ_BLOCK;
    const end = start + length;
    const blocks = Math.ceil((end - alignedStart) / READ_BLOCK);
    const command = `dd if=${shellEscape(path)} bs=${READ_BLOCK} skip=${alignedStart / READ_BLOCK} count=${blocks} 2>/dev/null`;
    const bytes = await runBinaryCommand(adb, command, {
        signal, timeout, maxBytes: (blocks + 1) * READ_BLOCK,
    });
    const offset = start - alignedStart;
    if (bytes.length < offset + length) throw new Error('APK 读取不完整');
    return bytes.subarray(offset, offset + length);
}

export async function readTail(adb, path, length = 131072, options) {
    const command = `tail -c ${Math.max(1, length)} ${shellEscape(path)} 2>/dev/null`;
    return runBinaryCommand(adb, command, { ...options, maxBytes: length + 4096 });
}
