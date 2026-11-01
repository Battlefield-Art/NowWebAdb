import { describe, expect, it } from 'vitest';
import { DEFAULT_SCRCPY_SETTINGS, normalizeScrcpySettings } from '@/lib/adb/scrcpySettings';

describe('scrcpy advanced settings', () => {
  it('fills new audio, camera and power defaults', () => {
    const settings = normalizeScrcpySettings({});
    expect(settings.videoSource).toBe('display');
    expect(settings.audioSource).toBe('output');
    expect(settings.audioCodec).toBe('aac');
    expect(settings.captureOrientation).toBe('');
    expect(settings.startScreenOff).toBe(false);
    expect(settings.powerOffOnClose).toBe(false);
    expect(settings.screenOffTimeoutSeconds).toBe(0);
    expect(settings.cameraFps).toBe(0);
    expect(settings.angle).toBe(0);
  });

  it('keeps valid advanced values', () => {
    expect(
      normalizeScrcpySettings({
        crop: '1080:1920:0:120',
        captureOrientation: 90,
        startScreenOff: true,
        powerOffOnClose: true,
        screenOffTimeoutSeconds: 30,
        audio: true,
        audioSource: 'mic',
        audioCodec: 'opus',
        audioBitRate: 192_000,
      }),
    ).toMatchObject({
      crop: '1080:1920:0:120',
      captureOrientation: 90,
      startScreenOff: true,
      powerOffOnClose: true,
      screenOffTimeoutSeconds: 30,
      audioSource: 'mic',
      audioCodec: 'opus',
      audioBitRate: 192_000,
    });
  });

  it('switches output audio to microphone when mirroring a camera', () => {
    const settings = normalizeScrcpySettings({ videoSource: 'camera', audio: true });
    expect(settings.audioSource).toBe('mic');
    expect(settings.cameraHighSpeed).toBe(false);
  });

  it('forces playback source when audio duplication is enabled', () => {
    expect(normalizeScrcpySettings({ audioDup: true, audioSource: 'mic' }).audioSource).toBe('playback');
  });

  it('rejects invalid crop, camera and orientation values', () => {
    expect(() => normalizeScrcpySettings({ crop: '1080x1920' })).toThrow();
    expect(() => normalizeScrcpySettings({ crop: '0:100:0:0' })).toThrow();
    expect(() => normalizeScrcpySettings({ cameraSize: '1920*1080' })).toThrow();
    expect(() => normalizeScrcpySettings({ cameraFacing: 'side' as never })).toThrow();
    expect(() => normalizeScrcpySettings({ angle: 45 as never })).toThrow();
    expect(() => normalizeScrcpySettings({ captureOrientation: 45 as never })).toThrow();
    expect(() => normalizeScrcpySettings({ screenOffTimeoutSeconds: -1 })).toThrow();
    expect(() => normalizeScrcpySettings({ audioCodec: 'mp3' as never })).toThrow();
  });

  it('has every default field normalized by itself', () => {
    expect(normalizeScrcpySettings(DEFAULT_SCRCPY_SETTINGS)).toEqual(DEFAULT_SCRCPY_SETTINGS);
  });
});
