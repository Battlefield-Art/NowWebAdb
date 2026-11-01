import { useCallback, useRef, type ClipboardEvent, type KeyboardEvent, type RefObject } from 'react';
import { AndroidKeyEventAction } from '@yume-chan/scrcpy';
import type { ScrcpyKeyboardMode } from '@/lib/adb/scrcpySettings';
import { keyboardMessage, type KeyMessage } from './scrcpyInput';
import type { ScrcpySession } from './scrcpySession';
import type { UhidInput } from './useUhidInput';

export interface MirrorKeyboardOptions {
  sessionRef: RefObject<ScrcpySession | null>;
  ready: boolean;
  keyboardEnabled: boolean;
  keyboardMode: ScrcpyKeyboardMode;
  uhid: UhidInput;
}

export interface MirrorKeyboard {
  releaseKeys: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onKeyUp: (event: KeyboardEvent<HTMLElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLElement>) => void;
}

export function useMirrorKeyboard({
  sessionRef,
  ready,
  keyboardEnabled,
  keyboardMode,
  uhid,
}: MirrorKeyboardOptions): MirrorKeyboard {
  const keys = useRef(new Map<string, KeyMessage>());

  const releaseKeys = useCallback(() => {
    const session = sessionRef.current;
    for (const key of keys.current.values()) {
      void session?.keyEvent(key.keyCode, AndroidKeyEventAction.Up, 0, 0);
    }
    keys.current.clear();
  }, [sessionRef]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (keyboardMode === 'uhid') {
      uhid.onKeyDown(event);
      return;
    }
    if (!ready || !keyboardEnabled) return;
    const message = keyboardMessage(event.nativeEvent);
    if (!message) return;
    event.preventDefault();
    keys.current.set(event.code, message);
    void sessionRef.current?.keyEvent(
      message.keyCode,
      AndroidKeyEventAction.Down,
      message.metaState,
      message.repeat,
    );
  };

  const onKeyUp = (event: KeyboardEvent<HTMLElement>) => {
    if (keyboardMode === 'uhid') {
      uhid.onKeyUp(event);
      return;
    }
    const previous = keys.current.get(event.code);
    if (!previous || !keyboardEnabled) return;
    event.preventDefault();
    keys.current.delete(event.code);
    const message = keyboardMessage(event.nativeEvent);
    void sessionRef.current?.keyEvent(
      previous.keyCode,
      AndroidKeyEventAction.Up,
      message?.metaState ?? 0,
      0,
    );
  };

  const onPaste = (event: ClipboardEvent<HTMLElement>) => {
    if (!ready || !keyboardEnabled) return;
    const target = event.target as Element | null;
    if (target?.closest?.('input, textarea, [contenteditable]')) return;
    const text = event.clipboardData.getData('text/plain');
    if (!text) return;
    event.preventDefault();
    void sessionRef.current?.setClipboard(text);
  };

  return { releaseKeys, onKeyDown, onKeyUp, onPaste };
}
