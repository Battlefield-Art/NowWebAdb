import {
  parseCpuLine,
  parseFrameCounters,
  parseMemoryTotalMb,
  parseNetDev,
  parseProcessTicks,
} from '@/lib/adb/performance';
import { buildPerformanceCsv } from '@/features/performance/performanceCsv';
import type { PerformanceSample } from '@/features/performance/performanceSampler';

describe('performance collectors', () => {
  it('parses aggregate CPU ticks and idle time', () => {
    expect(parseCpuLine('cpu  100 10 30 800 50 5 5 0 0 0')).toEqual({ total: 1000, idle: 850 });
    expect(parseCpuLine('cpu0 1 2 3 4')).toBeNull();
    expect(parseCpuLine('nothing here')).toBeNull();
  });

  it('parses process ticks with spaces inside the command name', () => {
    const line = '123 (com.example: worker) S 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15';
    expect(parseProcessTicks(line)).toBe(50);
    expect(parseProcessTicks('malformed')).toBeNull();
  });

  it('sums every interface except loopback', () => {
    const text = [
      'Interfaces: 1 2 3 4 5 6 7',
      '  lo: 999 0 0 0 0 0 0 0 999 0 0 0 0 0 0 0',
      'wlan0: 1024 1 1 1 1 1 1 1 2048 1 1 1 1 1 1 1',
      'rmnet0: 1024 1 1 1 1 1 1 1 2048 1 1 1 1 1 1 1',
    ].join('\n');
    expect(parseNetDev(text)).toEqual({ rx: 2048, tx: 4096 });
    expect(parseNetDev('')).toBeNull();
  });

  it('parses total PSS from dumpsys meminfo', () => {
    expect(parseMemoryTotalMb('TOTAL PSS:  204800')).toBe(200);
    expect(parseMemoryTotalMb('TOTAL     1048576   0   0')).toBe(1024);
    expect(parseMemoryTotalMb('no totals')).toBeNull();
  });

  it('parses gfxinfo frame counters', () => {
    expect(parseFrameCounters('Total frames rendered: 1200\nJanky frames: 12 (1.00%)')).toEqual({
      frames: 1200,
      janky: 12,
    });
    expect(parseFrameCounters('Janky frames: 3')).toBeNull();
  });
});

describe('performance csv', () => {
  it('writes headers and leaves missing values empty', () => {
    const samples: PerformanceSample[] = [{
      timestamp: Date.UTC(2026, 0, 2, 3, 4, 5),
      cpuApp: 12.5,
      cpuSystem: null,
      memoryMB: 200,
      fps: 60,
      janky: 2,
      rxKbps: null,
      txKbps: 1.5,
      batteryLevel: 80,
      batteryTemp: 31.2,
    }];
    const [header, row = ''] = buildPerformanceCsv(samples).split('\n');
    expect(header).toContain('CPU App (%)');
    expect(row).toContain('2026-01-02T03:04:05.000Z,12.5,,200,60,2,,1.5,80,31.2');
  });
});
