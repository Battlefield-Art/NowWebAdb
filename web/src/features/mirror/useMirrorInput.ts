import {
  useCallback,
  useEffect,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import type { ScrcpyKeyboardMode, ScrcpyMouseMode } from '@/lib/adb/scrcpySettings';
import type { DevicePoint } from './scrcpyInput';
import type { WheelInput } from './scrcpyMessages';
import type { ScrcpySession } from './scrcpySession';
import { useMirrorKeyboard } from './useMirrorKeyboard';
import { useMirrorPointer } from './useMirrorPointer';
import { useUhidInput } from './useUhidInput';
import type { VideoContent } from './videoPadding';

export type { WheelInput } from './scrcpyMessages';

export interface MirrorInput {
  coordinates: DevicePoint | undefined;
  showCoordinates: boolean;
  toggleCoordinates: () => void;
  keyboardEnabled: boolean;
  toggleKeyboard: () => void;
  mouseLocked: boolean;
  releaseInput: () => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
  onWheel: (event: WheelInput) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onKeyUp: (event: KeyboardEvent<HTMLElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLElement>) => void;
}

export function useMirrorInput(
  sessionRef: RefObject<ScrcpySession | null>,
  ready: boolean,
  width: number,
  height: number,
  content: VideoContent | undefined,
  fill: boolean,
  keyboardMode: ScrcpyKeyboardMode,
  mouseMode: ScrcpyMouseMode,
): MirrorInput {
  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
  const uhid = useUhidInput(sessionRef, ready, keyboardEnabled, keyboardMode, mouseMode);
  const pointer = useMirrorPointer({
    sessionRef,
    ready,
    mouseMode,
    uhid,
    view: { width, height, content, fill },
  });
  const keyboard = useMirrorKeyboard({
    sessionRef,
    ready,
    keyboardEnabled,
    keyboardMode,
    uhid,
  });

  const { release } = uhid;
  const { releaseKeys } = keyboard;
  const { releasePointers } = pointer;
  const releaseInput = useCallback(() => {
    release();
    releaseKeys();
    releasePointers();
  }, [release, releaseKeys, releasePointers]);

  useEffect(() => {
    const onBlur = () => releaseInput();
    const onVisibility = () => {
      if (document.hidden) releaseInput();
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [releaseInput]);

  const toggleKeyboard = () => {
    if (keyboardEnabled) releaseInput();
    setKeyboardEnabled(value => !value);
  };

  return {
    coordinates: pointer.coordinates,
    showCoordinates: pointer.showCoordinates,
    toggleCoordinates: pointer.toggleCoordinates,
    keyboardEnabled,
    toggleKeyboard,
    mouseLocked: uhid.mouseLocked,
    releaseInput,
    onPointerDown: pointer.onPointerDown,
    onPointerMove: pointer.onPointerMove,
    onPointerUp: pointer.onPointerUp,
    onPointerLeave: pointer.onPointerLeave,
    onWheel: pointer.onWheel,
    onKeyDown: keyboard.onKeyDown,
    onKeyUp: keyboard.onKeyUp,
    onPaste: keyboard.onPaste,
  };
}
