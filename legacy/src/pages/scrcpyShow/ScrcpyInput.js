import { AndroidKeyCode, AndroidKeyEventMeta } from '@yume-chan/scrcpy';

export function mapVideoPosition(clientX, clientY, rect, width, height) {
    if (!rect?.width || !rect?.height || width <= 0 || height <= 0) return undefined;
    const clamp = (value, max) => Math.max(0, Math.min(max, Math.floor(value)));
    return {
        x: clamp((clientX - rect.left) / rect.width * width, width - 1),
        y: clamp((clientY - rect.top) / rect.height * height, height - 1),
    };
}

export function keyboardMessage(event) {
    if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return undefined;
    if (event.target?.closest?.('input, textarea, select, button, [contenteditable]:not([contenteditable="false"])')) return undefined;
    // Keep browser/OS shortcuts and fullscreen escape local.
    if (event.metaKey || event.altKey || /^F\d+$/.test(event.code) || event.code === 'Escape') return undefined;
    if (event.ctrlKey && !['KeyA', 'KeyC', 'KeyX', 'KeyZ', 'KeyY', 'ControlLeft', 'ControlRight'].includes(event.code)) return undefined;
    const keyCode = AndroidKeyCode[event.code];
    if (keyCode === undefined) return undefined;
    let metaState = 0;
    for (const [property, flag] of [['shiftKey', 'Shift'], ['ctrlKey', 'Ctrl'], ['altKey', 'Alt'], ['metaKey', 'Meta']]) {
        if (event[property]) metaState |= AndroidKeyEventMeta[flag];
    }
    for (const lock of ['CapsLock', 'NumLock', 'ScrollLock']) {
        if (event.getModifierState?.(lock)) metaState |= AndroidKeyEventMeta[lock];
    }
    return { keyCode, metaState, repeat: event.repeat ? 1 : 0 };
}
