import { describe, expect, it } from 'vitest';
import { bugReportMethod } from '@/lib/adb/diagnostics';
import { normalizeScrcpySettings } from '@/lib/adb/scrcpySettings';

describe('scrcpy source options', () => {
  it('defaults display, encoder and screen options', () => {
    const settings = normalizeScrcpySettings({});
    expect(settings.displayId).toBe(0);
    expect(settings.videoEncoder).toBe('');
    expect(settings.showTouches).toBe(false);
    expect(settings.stayAwake).toBe(false);
  });

  it('keeps valid display, encoder and screen options', () => {
    expect(
      normalizeScrcpySettings({
        displayId: 2,
        videoEncoder: 'OMX.qcom.video.encoder.avc',
        showTouches: true,
        stayAwake: true,
      }),
    ).toMatchObject({
      displayId: 2,
      videoEncoder: 'OMX.qcom.video.encoder.avc',
      showTouches: true,
      stayAwake: true,
    });
  });

  it('rejects invalid display ids and encoder names', () => {
    expect(() => normalizeScrcpySettings({ displayId: -1 })).toThrow();
    expect(() => normalizeScrcpySettings({ displayId: 5000 })).toThrow();
    expect(() => normalizeScrcpySettings({ videoEncoder: 'bad encoder' })).toThrow();
    expect(() => normalizeScrcpySettings({ videoEncoder: 'x'.repeat(129) })).toThrow();
  });
});

describe('bug report method selection', () => {
  const base = { version: '1.2', flat: false, zipped: true, progress: true, stream: true };

  it('prefers streaming, then file, then flat output', () => {
    expect(bugReportMethod(base)).toBe('stream');
    expect(bugReportMethod({ ...base, stream: false })).toBe('file');
    expect(bugReportMethod({ ...base, stream: false, zipped: false })).toBe('flat');
  });
});
