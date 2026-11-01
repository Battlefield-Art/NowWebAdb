import { keyboardMessage, mapFilledPosition, mapVideoPosition, resolveKeyCode } from '@/features/mirror/scrcpyInput';

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return new DOMRect(left, top, width, height);
}

describe('mirror input', () => {
  it('maps touch points into the letterboxed video area', () => {
    const stage = rect(0, 0, 1000, 500);
    expect(mapVideoPosition(500, 250, stage, 400, 800)).toEqual({ x: 200, y: 400 });
    expect(mapVideoPosition(375, 0, stage, 400, 800)).toEqual({ x: 0, y: 0 });
    expect(mapVideoPosition(0, 0, stage, 400, 800)).toBeUndefined();
  });

  it('maps edge points without exceeding the video bounds', () => {
    const stage = rect(10, 20, 400, 800);
    expect(mapVideoPosition(410, 820, stage, 400, 800)).toEqual({ x: 399, y: 799 });
  });

  it('maps points onto the cropped content when the video fills the stage', () => {
    const stage = rect(0, 0, 400, 800);
    const content = { top: 8, bottom: 8, width: 400, height: 800 };
    expect(mapFilledPosition(200, 400, stage, 400, 816, content)).toEqual({ x: 200, y: 408 });
    expect(mapFilledPosition(0, 0, stage, 400, 816, content)).toEqual({ x: 0, y: 8 });
    expect(mapFilledPosition(400, 800, stage, 400, 816, content)).toEqual({ x: 399, y: 807 });
    expect(mapFilledPosition(200, 400, stage, 400, 816, undefined)).toEqual({ x: 200, y: 408 });
  });

  it('resolves key names and keeps browser shortcuts local', () => {
    expect(resolveKeyCode('AndroidBack')).toBe(4);
    expect(resolveKeyCode(66)).toBe(66);
    const key = new KeyboardEvent('keydown', { code: 'KeyA', key: 'a' });
    expect(keyboardMessage(key)?.keyCode).toBe(resolveKeyCode('KeyA'));
    const escape = new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' });
    expect(keyboardMessage(escape)).toBeUndefined();
    const ctrlB = new KeyboardEvent('keydown', { code: 'KeyB', key: 'b', ctrlKey: true });
    expect(keyboardMessage(ctrlB)).toBeUndefined();
  });
});
