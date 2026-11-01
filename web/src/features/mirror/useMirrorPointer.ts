import {
  useCallback,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from 'react';
import { AndroidMotionEventAction } from '@yume-chan/scrcpy';
import type { ScrcpyMouseMode } from '@/lib/adb/scrcpySettings';
import { mapFilledPosition, mapVideoPosition, type DevicePoint } from './scrcpyInput';
import type { TouchMessage, WheelInput } from './scrcpyMessages';
import type { ScrcpySession } from './scrcpySession';
import type { UhidInput } from './useUhidInput';
import type { VideoContent } from './videoPadding';

type Pointer = Omit<TouchMessage, 'action'>;

interface Positioned {
  clientX: number;
  clientY: number;
  currentTarget: HTMLElement;
}

export interface MirrorView {
  width: number;
  height: number;
  content: VideoContent | undefined;
  fill: boolean;
}

export interface MirrorPointerOptions {
  sessionRef: RefObject<ScrcpySession | null>;
  ready: boolean;
  mouseMode: ScrcpyMouseMode;
  view: MirrorView;
  uhid: UhidInput;
}

export interface MirrorPointer {
  coordinates: DevicePoint | undefined;
  showCoordinates: boolean;
  toggleCoordinates: () => void;
  releasePointers: () => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
  onWheel: (event: WheelInput) => void;
}

export function useMirrorPointer({
  sessionRef,
  ready,
  mouseMode,
  view,
  uhid,
}: MirrorPointerOptions): MirrorPointer {
  const [coordinates, setCoordinates] = useState<DevicePoint>();
  const [showCoordinates, setShowCoordinates] = useState(false);
  const pointers = useRef(new Map<number, Pointer>());

  const releasePointers = useCallback(() => {
    const session = sessionRef.current;
    for (const pointer of pointers.current.values()) {
      void session?.touch({ ...pointer, action: AndroidMotionEventAction.Up, pressure: 0 });
    }
    pointers.current.clear();
  }, [sessionRef]);

  const pointAt = (event: Positioned): DevicePoint | undefined => {
    const { width, height, content, fill } = view;
    const rect = event.currentTarget.getBoundingClientRect();
    return fill
      ? mapFilledPosition(event.clientX, event.clientY, rect, width, height, content)
      : mapVideoPosition(event.clientX, event.clientY, rect, width, height);
  };

  const sendTouch = (event: PointerEvent<HTMLElement>, action: AndroidMotionEventAction) => {
    const session = sessionRef.current;
    const point = pointAt(event);
    if (!session || !point) return;
    const ending = action === AndroidMotionEventAction.Up || action === AndroidMotionEventAction.Cancel;
    const message: TouchMessage = {
      action,
      pointerId: event.pointerId,
      x: point.x,
      y: point.y,
      pressure: ending ? 0 : event.pressure || 1,
    };
    if (ending) pointers.current.delete(event.pointerId);
    else pointers.current.set(event.pointerId, { ...message });
    void session.touch(message);
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (mouseMode === 'uhid') {
      uhid.onPointerDown(event);
      return;
    }
    if (!ready || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    sendTouch(event, AndroidMotionEventAction.Down);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (mouseMode === 'uhid') {
      uhid.onPointerMove(event);
      return;
    }
    if (showCoordinates) {
      setCoordinates(pointAt(event));
    }
    if (!ready || !pointers.current.has(event.pointerId)) return;
    sendTouch(event, AndroidMotionEventAction.Move);
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (mouseMode === 'uhid') {
      uhid.onPointerUp(event);
      return;
    }
    if (!pointers.current.has(event.pointerId)) return;
    sendTouch(event, AndroidMotionEventAction.Up);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onWheel = (event: WheelInput) => {
    if (mouseMode === 'uhid') {
      uhid.onWheel(event);
      return;
    }
    const session = sessionRef.current;
    if (!ready || !session) return;
    const point = pointAt(event);
    if (!point) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 300 : 1;
    const clamp = (delta: number) => Math.max(-1, Math.min(1, (-delta * unit) / 100));
    void session.scroll({ x: point.x, y: point.y, scrollX: clamp(event.deltaX), scrollY: clamp(event.deltaY) });
  };

  return {
    coordinates,
    showCoordinates,
    toggleCoordinates: () => setShowCoordinates(value => !value),
    releasePointers,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave: () => setCoordinates(undefined),
    onWheel,
  };
}
