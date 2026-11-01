import { computed, ref, shallowRef } from 'vue';
import { WritableStream } from '@yume-chan/stream-extra';
import { AdbScrcpyClient, AdbScrcpyOptions3_3_3 } from '@yume-chan/adb-scrcpy';
import {
    AndroidKeyCode, AndroidKeyEventAction, AndroidMotionEventAction,
    AndroidScreenPowerMode, DefaultServerPath, ScrcpyInstanceId,
} from '@yume-chan/scrcpy';
import { WebCodecsVideoDecoder, WebGLVideoFrameRenderer } from '@yume-chan/scrcpy-decoder-webcodecs';
import { getAdbInstance } from '@/utils/adbManager.js';
import { pushServerAndStartScrcpyClient } from '@/utils/adbUtils.js';
import { normalizeScrcpySettings } from '@/utils/scrcpySettings.js';
import { mapVideoPosition, keyboardMessage } from './ScrcpyInput.js';
import { ScrcpyAudioPlayer } from './ScrcpyAudio.js';
import { measureVideoPadding } from './videoPadding.js';

export function useScrcpy() {
    const client = shallowRef();
    const width = ref(0);
    const height = ref(0);
    const contentRect = ref();
    const openInput = ref(true);
    const connectionStatus = ref('idle');
    const connectionError = ref('');
    const controlError = ref('');
    const audioStatus = ref('音频已关闭');
    const deviceClipboard = ref('');
    const ready = computed(() => connectionStatus.value === 'connected' && !!client.value?.controller);
    let generation = 0;
    let session;

    const active = (s) => session === s && s.id === generation && !s.abort.signal.aborted;
    const reportCleanup = (error) => console.warn('scrcpy cleanup:', error);
    const errorText = (error) => [error.message || String(error), ...(error.output || [])].join('\n');

    function cleanup(s) {
        if (!s) return Promise.resolve();
        if (s.cleanup) return s.cleanup;
        clearTimeout(s.timeout);
        s.abort.abort();
        const operations = [
            () => s.sizeListener?.dispose(),
            () => s.decoder?.dispose(),
            () => s.canvas?.remove(),
            () => s.client ? s.client.close() : s.process?.kill(),
            () => s.audio?.dispose(),
        ];
        s.cleanup = Promise.allSettled(operations.map((operation) => {
            try { return operation(); } catch (error) { return Promise.reject(error); }
        })).then((results) => {
            for (const result of results) if (result.status === 'rejected') reportCleanup(result.reason);
        });
        return s.cleanup;
    }

    function fail(s, error) {
        if (!active(s)) return;
        connectionStatus.value = 'error';
        connectionError.value = errorText(error);
        audioStatus.value = '音频已停止';
        client.value = undefined;
        void cleanup(s);
    }

    function consume(s, stream, sink, label, required = false) {
        const pipe = stream.pipeTo(sink, { signal: s.abort.signal });
        void pipe.then(() => {
            if (required && active(s)) fail(s, new Error(`${label}已结束，请重新连接`));
        }, (error) => {
            if (active(s)) fail(s, new Error(`${label}: ${errorText(error)}`));
        });
    }

    async function setupAudio(s, metadataPromise) {
        try {
            const metadata = await metadataPromise;
            if (!metadata) return;
            if (!active(s)) {
                if (metadata.type === 'success') await metadata.stream.cancel();
                return;
            }
            if (metadata.type !== 'success') {
                audioStatus.value = metadata.type === 'disabled' ? '设备未提供音频（通常需要 Android 11+）' : '设备音频启动失败';
                return;
            }
            if (ScrcpyAudioPlayer.isSupported && metadata.codec.optionValue === 'aac') {
                try {
                    s.audio = new ScrcpyAudioPlayer((status) => { if (active(s)) audioStatus.value = status; });
                } catch (error) {
                    audioStatus.value = `音频不可用: ${errorText(error)}`;
                }
            } else {
                audioStatus.value = '此浏览器不支持音频解码';
            }
            // Even without a decoder, drain audio so the shared ADB transport cannot stall.
            await metadata.stream.pipeTo(new WritableStream({ write: (packet) => s.audio?.write(packet) }), { signal: s.abort.signal });
            if (active(s)) audioStatus.value = '音频流已结束';
        } catch (error) {
            if (active(s)) audioStatus.value = `音频流错误: ${errorText(error)}`;
        } finally {
            if (s.audio) await s.audio.dispose().catch(reportCleanup);
        }
    }

    async function setupVideo(s, metadataPromise, container) {
        const video = await metadataPromise;
        if (!video) throw new Error('服务端未提供视频流');
        if (!active(s)) {
            await video.stream.cancel();
            return;
        }
        s.canvas = document.createElement('canvas');
        const renderer = new WebGLVideoFrameRenderer(s.canvas);
        const draw = renderer.draw.bind(renderer);
        renderer.draw = async (frame) => {
            await draw(frame);
            if (!active(s)) return;
            clearTimeout(s.timeout);
            connectionStatus.value = 'connected';
            // Probe for encoder padding: the first frames may still be blank, so keep
            // sampling (with a coarser interval after the first couple of seconds).
            const now = performance.now();
            const interval = (s.probes || 0) < 20 ? 120 : 600;
            if (!s.content && (s.probes || 0) < 60 && now - (s.probedAt || 0) > interval) {
                s.probedAt = now;
                s.probes = (s.probes || 0) + 1;
                try {
                    const content = measureVideoPadding(frame);
                    if (content) {
                        s.content = content;
                        contentRect.value = content;
                    }
                } catch (error) {
                    console.warn('scrcpy padding probe:', error);
                }
            }
        };
        s.decoder = new WebCodecsVideoDecoder({ codec: video.metadata.codec, renderer });
        s.sizeListener = s.decoder.sizeChanged((size) => {
            if (!active(s)) return;
            const key = `${size.width}x${size.height}`;
            if (s.videoSize !== key) {
                s.videoSize = key;
                s.content = undefined;
                s.probes = 0;
                contentRect.value = undefined;
            }
            width.value = size.width;
            height.value = size.height;
        });
        container.appendChild(s.canvas);
        consume(s, video.stream, s.decoder.writable, '视频流', true);
    }

    async function scrcpyStart(container, settings) {
        const id = ++generation;
        const previous = session;
        session = undefined;
        client.value = undefined;
        connectionStatus.value = 'connecting';
        connectionError.value = '';
        controlError.value = '';
        deviceClipboard.value = '';
        width.value = height.value = 0;
        contentRect.value = undefined;
        await cleanup(previous);
        if (id !== generation) return;
        const s = { id, abort: new AbortController(), keys: new Map(), pointers: new Map() };
        session = s;
        s.timeout = setTimeout(() => fail(s, new Error('投屏启动超时，请检查设备授权和服务端版本 (3.3.3)')), 30000);
        try {
            const config = normalizeScrcpySettings(settings);
            audioStatus.value = config.audio ? '正在等待设备音频' : '音频已关闭';
            if (!container) throw new Error('视频容器未就绪');
            if (!WebCodecsVideoDecoder.isSupported) throw new Error('此浏览器不支持 WebCodecs，请使用安全上下文中的新版 Chrome / Edge');
            const adb = getAdbInstance();
            if (!adb) throw new Error('请先连接 ADB 设备');
            await pushServerAndStartScrcpyClient(adb, '/server.bin', s.abort.signal);
            if (!active(s)) return;
            const options = new AdbScrcpyOptions3_3_3({ ...config, scid: ScrcpyInstanceId.random(), tunnelForward: true }, {
                spawner: {
                    spawn: async (...args) => {
                        s.abort.signal.throwIfAborted();
                        const process = await adb.subprocess.noneProtocol.spawn(...args);
                        s.process = process;
                        if (!active(s)) {
                            await process.kill();
                            s.abort.signal.throwIfAborted();
                        }
                        return process;
                    },
                },
            });
            const started = await AdbScrcpyClient.start(adb, DefaultServerPath, options);
            s.client = started;
            // Attach observers immediately, including metadata promises that can reject independently.
            void started.exited.then(() => fail(s, new Error('scrcpy 服务端已退出')), (error) => fail(s, error));
            void setupAudio(s, started.audioStream);
            void setupVideo(s, started.videoStream, container).catch((error) => fail(s, error));
            consume(s, started.output, new WritableStream({ write(line) { console.debug('[scrcpy]', line); } }), '服务端输出');
            if (started.clipboard) {
                consume(s, started.clipboard, new WritableStream({ write(text) { if (active(s)) deviceClipboard.value = text; } }), '设备剪贴板');
            }
            if (!active(s)) {
                await started.close();
                return;
            }
            if (!started.controller) throw new Error('服务端未提供控制通道');
            client.value = started;
        } catch (error) {
            fail(s, error);
        }
    }

    async function destroyClient() {
        ++generation;
        const previous = session;
        session = undefined;
        client.value = undefined;
        connectionStatus.value = 'idle';
        connectionError.value = '';
        controlError.value = '';
        audioStatus.value = '音频已关闭';
        deviceClipboard.value = '';
        width.value = height.value = 0;
        contentRect.value = undefined;
        await cleanup(previous);
    }

    async function command(action) {
        const s = session;
        if (!ready.value || !active(s)) return false;
        try {
            controlError.value = '';
            await action(s.client.controller);
            return active(s);
        } catch (error) {
            if (active(s)) controlError.value = `操作失败: ${errorText(error)}`;
            return false;
        }
    }

    const pressKey = (_event, name) => command(async (controller) => {
        const keyCode = typeof name === 'number' ? name : AndroidKeyCode[name];
        if (keyCode === undefined) throw new Error(`未知按键: ${name}`);
        await controller.injectKeyCode({ action: AndroidKeyEventAction.Down, keyCode, repeat: 0, metaState: 0 });
        await controller.injectKeyCode({ action: AndroidKeyEventAction.Up, keyCode, repeat: 0, metaState: 0 });
    });
    const sendClipboard = (content) => command((controller) => controller.setClipboard({ content, paste: true, sequence: 0n }));
    const rotateDevice = () => command((controller) => controller.rotateDevice());
    const expandNotifications = () => command((controller) => controller.expandNotificationPanel());
    const setScreenPower = (on) => command((controller) => controller.setScreenPowerMode(on ? AndroidScreenPowerMode.Normal : AndroidScreenPowerMode.Off));

    function handleKeyEvent(event) {
        if (!ready.value || !openInput.value) return;
        const s = session;
        const previous = s.keys.get(event.code);
        const message = keyboardMessage(event);
        if (event.type === 'keyup' && previous) {
            event.preventDefault();
            s.keys.delete(event.code);
            void command((controller) => controller.injectKeyCode({ ...previous, metaState: message?.metaState ?? 0, action: AndroidKeyEventAction.Up, repeat: 0 }));
        } else if (event.type === 'keydown' && message) {
            event.preventDefault();
            s.keys.set(event.code, message);
            void command((controller) => controller.injectKeyCode({ ...message, action: AndroidKeyEventAction.Down }));
        }
    }

    function handlePaste(event) {
        if (!ready.value || !openInput.value || event.target?.closest?.('input, textarea, [contenteditable]')) return;
        const text = event.clipboardData?.getData('text/plain');
        if (text) { event.preventDefault(); void sendClipboard(text); }
    }

    const clientPositionToDevicePosition = (x, y) => mapVideoPosition(x, y, session?.canvas?.getBoundingClientRect(), width.value, height.value);
    function touch(event, action) {
        if (!ready.value) return;
        const position = clientPositionToDevicePosition(event.clientX, event.clientY);
        if (!position) return;
        const s = session;
        const ending = action === AndroidMotionEventAction.Up || action === AndroidMotionEventAction.Cancel;
        const message = {
            action, pointerId: BigInt(event.pointerId), pointerX: position.x, pointerY: position.y,
            videoWidth: width.value, videoHeight: height.value, pressure: ending ? 0 : (event.pressure || 1),
            actionButton: 0, buttons: 0,
        };
        if (ending) s.pointers.delete(event.pointerId);
        else s.pointers.set(event.pointerId, message);
        void command((controller) => controller.injectTouch(message));
    }
    function handlePointerDown(event) {
        if (!ready.value || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        touch(event, AndroidMotionEventAction.Down);
    }
    function handlePointerMove(event) {
        if (session?.pointers.has(event.pointerId)) touch(event, AndroidMotionEventAction.Move);
    }
    function handlePointerUp(event) {
        if (!session?.pointers.has(event.pointerId)) return;
        touch(event, AndroidMotionEventAction.Up);
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }
    function releaseInput() {
        const s = session;
        if (!s) return;
        for (const message of s.keys.values()) {
            void command((controller) => controller.injectKeyCode({ ...message, action: AndroidKeyEventAction.Up, metaState: 0, repeat: 0 }));
        }
        for (const message of s.pointers.values()) {
            void command((controller) => controller.injectTouch({ ...message, action: AndroidMotionEventAction.Up, pressure: 0 }));
        }
        s.keys.clear();
        s.pointers.clear();
    }
    function openKeyInput(type) {
        releaseInput();
        openInput.value = type === 'open';
    }
    function handleWheel(event) {
        if (!ready.value) return;
        const position = clientPositionToDevicePosition(event.clientX, event.clientY);
        if (!position) return;
        event.preventDefault();
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 300 : 1;
        const scroll = (delta) => Math.max(-1, Math.min(1, -delta * unit / 100));
        void command((controller) => controller.injectScroll({
            pointerX: position.x, pointerY: position.y, videoWidth: width.value, videoHeight: height.value,
            scrollX: scroll(event.deltaX), scrollY: scroll(event.deltaY), buttons: 0,
        }));
    }
    async function screenshot() {
        const s = session;
        if (!ready.value) return;
        try {
            const blob = await s.decoder.snapshot();
            if (!active(s)) return;
            if (!blob) throw new Error('尚未收到可截图的视频帧');
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `scrcpy-${Date.now()}.png`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            if (active(s)) controlError.value = `截图失败: ${errorText(error)}`;
        }
    }
    async function resumeAudio() {
        const s = session;
        try {
            if (!s?.audio) throw new Error('音频未就绪');
            await s.audio.resume();
        } catch (error) {
            if (s && active(s)) audioStatus.value = `音频不可用: ${errorText(error)}`;
        }
    }

    return {
        client, width, height, contentRect, openInput, ready, connectionStatus, connectionError, controlError,
        audioStatus, deviceClipboard, scrcpyStart, destroyClient, pressKey, sendClipboard, rotateDevice,
        expandNotifications, setScreenPower, handleKeyEvent, handlePaste, openKeyInput, releaseInput,
        handlePointerDown, handlePointerMove, handlePointerUp, handleWheel, clientPositionToDevicePosition,
        screenshot, resumeAudio,
    };
}
