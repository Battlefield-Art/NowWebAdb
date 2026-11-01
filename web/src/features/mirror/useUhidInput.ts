import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { HidKeyboardState, mouseButtonMask, wheelTicks } from './scrcpyHid';
import { isEditableTarget } from './scrcpyInput';
import type { ScrcpyKeyboardMode, ScrcpyMouseMode } from '@/lib/adb/scrcpySettings';
import type { WheelInput } from './scrcpyMessages';
import type { ScrcpySession } from './scrcpySession';

function requestLock(element: HTMLElement): void {
  if (typeof element.requestPointerLock !== 'function') return;
  try {
    const result = element.requestPointerLock() as unknown;
    if (result instanceof Promise) void result.catch(() => undefined);
  } catch {
    /* pointer lock unavailable */
  }
}

export interface UhidInput {
  mouseLocked: boolean;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onWheel: (event: WheelInput) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onKeyUp: (event: KeyboardEvent<HTMLElement>) => void;
  release: () => void;
}

export function useUhidInput(
  sessionRef: RefObject<ScrcpySession | null>,
  ready: boolean,
  keyboardEnabled: boolean,
  keyboardMode: ScrcpyKeyboardMode,
  mouseMode: ScrcpyMouseMode,
): UhidInput {
  const [mouseLocked, setMouseLocked] = useState(false);
  const keyboard = useRef(new HidKeyboardState());
  const buttons = useRef(0);
  const lockRef = useRef(false);
  const session = () => sessionRef.current;

  useEffect(() => {
    const onChange = () => {
      const locked = document.pointerLockElement !== null;
      lockRef.current = locked;
      setMouseLocked(locked);
      if (!locked && buttons.current !== 0) {
        buttons.current = 0;
        void sessionRef.current?.hidMouse(0, 0, 0);
      }
    };
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, [sessionRef]);

  const release = useCallback(() => {
    void sessionRef.current?.hidKeyboard(keyboard.current.release());
    if (buttons.current !== 0) {
      buttons.current = 0;
      void sessionRef.current?.hidMouse(0, 0, 0);
    }
    if (document.pointerLockElement) void document.exitPointerLock();
  }, [sessionRef]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (mouseMode !== 'uhid' || !ready) return;
    event.preventDefault();
    event.currentTarget.focus();
    if (!lockRef.current) {
      requestLock(event.currentTarget);
      return;
    }
    buttons.current |= mouseButtonMask(event.button);
    void session()?.hidMouse(buttons.current, 0, 0);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (mouseMode !== 'uhid' || !lockRef.current) return;
    const dx = event.movementX;
    const dy = event.movementY;
    if (!dx && !dy) return;
    void session()?.hidMouse(buttons.current, dx, dy);
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (mouseMode !== 'uhid' || !lockRef.current) return;
    buttons.current &= ~mouseButtonMask(event.button);
    void session()?.hidMouse(buttons.current, 0, 0);
  };

  const onWheel = (event: WheelInput) => {
    if (mouseMode !== 'uhid' || !ready) return;
    void session()?.hidMouse(buttons.current, 0, 0, wheelTicks(event.deltaY, event.deltaMode));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (keyboardMode !== 'uhid' || !ready || !keyboardEnabled) return;
    const native = event.nativeEvent;
    if (native.isComposing || native.keyCode === 229 || native.code === 'Escape') return;
    if (isEditableTarget(native.target)) return;
    const report = keyboard.current.down(native);
    if (!report) return;
    event.preventDefault();
    void session()?.hidKeyboard(report);
  };

  const onKeyUp = (event: KeyboardEvent<HTMLElement>) => {
    if (keyboardMode !== 'uhid' || !keyboardEnabled) return;
    const native = event.nativeEvent;
    if (isEditableTarget(native.target)) return;
    const report = keyboard.current.up(native);
    if (!report) return;
    event.preventDefault();
    void session()?.hidKeyboard(report);
  };

  return { mouseLocked, onPointerDown, onPointerMove, onPointerUp, onWheel, onKeyDown, onKeyUp, release };
}
