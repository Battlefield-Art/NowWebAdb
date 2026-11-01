import { describe, expect, it } from 'vitest';
import { parseCameraLines } from '@/lib/adb/scrcpyProbe';

describe('scrcpy camera probing', () => {
  it('groups sizes by camera id and keeps facing', () => {
    const cameras = parseCameraLines([
      '[server] INFO: --camera-id=0 --camera-facing=back --camera-size=1920x1080',
      '--camera-id=0 --camera-size=1280x720',
      '--camera-id=0 --camera-size=1920x1080',
    ]);
    expect(cameras).toEqual([{ id: '0', facing: 'back', sizes: ['1920x1080', '1280x720'] }]);
  });

  it('sorts cameras numerically and ignores malformed lines', () => {
    const cameras = parseCameraLines([
      '--camera-id=10 --camera-facing=external --camera-size=800x600',
      '--camera-id=2 --camera-size=bad-size',
      'no camera here',
      '--camera-id=1 --camera-facing=front --camera-size=640x480',
    ]);
    expect(cameras.map(camera => camera.id)).toEqual(['1', '2', '10']);
    expect(cameras[1]).toEqual({ id: '2', facing: undefined, sizes: [] });
  });
});
