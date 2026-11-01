import type { AndroidMotionEventAction } from '@yume-chan/scrcpy';

export interface TouchMessage {
  action: AndroidMotionEventAction;
  pointerId: number;
  x: number;
  y: number;
  pressure: number;
}

export interface ScrollMessage {
  x: number;
  y: number;
  scrollX: number;
  scrollY: number;
}

export interface WheelInput {
  clientX: number;
  clientY: number;
  currentTarget: HTMLElement;
  deltaX: number;
  deltaY: number;
  deltaMode: number;
}
