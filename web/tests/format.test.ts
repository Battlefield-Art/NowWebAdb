import { describe, expect, it } from 'vitest';
import { formatBytes, formatUptime, toErrorMessage } from '@/lib/utils/format';

describe('formatBytes', () => {
  it('keeps sub-kilobyte sizes in bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('scales units and rounds to the requested precision', () => {
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(5 * 1024 * 1024, 1)).toBe('5.0 MB');
    expect(formatBytes(3 * 1024 ** 3)).toBe('3.00 GB');
  });

  it('returns a dash for invalid input', () => {
    expect(formatBytes(Number.NaN)).toBe('—');
    expect(formatBytes(-1)).toBe('—');
  });
});

describe('formatUptime', () => {
  it('formats days, hours and minutes', () => {
    expect(formatUptime(90061)).toBe('1 天 1 小时 1 分钟');
  });

  it('skips empty day and hour segments', () => {
    expect(formatUptime(125)).toBe('2 分钟');
    expect(formatUptime(3600)).toBe('1 小时 0 分钟');
  });

  it('returns a dash for invalid input', () => {
    expect(formatUptime(0)).toBe('—');
    expect(formatUptime(Number.NaN)).toBe('—');
  });
});

describe('toErrorMessage', () => {
  it('unwraps errors and strings', () => {
    expect(toErrorMessage(new Error('设备已断开'))).toBe('设备已断开');
    expect(toErrorMessage('桥接不可用')).toBe('桥接不可用');
    expect(toErrorMessage(null)).toBe('未知错误');
  });
});
