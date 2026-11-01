import { saveToDisk, timestampForFilename } from '@/lib/utils/download';
import type { PerformanceSample } from './performanceSampler';

const HEADER = [
  'Timestamp',
  'CPU App (%)',
  'CPU System (%)',
  'Memory (MB)',
  'FPS',
  'Janky Frames',
  'Network RX (KB/s)',
  'Network TX (KB/s)',
  'Battery (%)',
  'Temperature (°C)',
];

function cell(value: number | null): string {
  return value === null ? '' : String(value);
}

export function buildPerformanceCsv(samples: readonly PerformanceSample[]): string {
  const lines = [HEADER.join(',')];
  for (const sample of samples) {
    lines.push([
      new Date(sample.timestamp).toISOString(),
      cell(sample.cpuApp),
      cell(sample.cpuSystem),
      cell(sample.memoryMB),
      cell(sample.fps),
      cell(sample.janky),
      cell(sample.rxKbps),
      cell(sample.txKbps),
      cell(sample.batteryLevel),
      cell(sample.batteryTemp),
    ].join(','));
  }
  return lines.join('\n');
}

export function downloadPerformanceCsv(samples: readonly PerformanceSample[], packageName: string): void {
  const csv = `\uFEFF${buildPerformanceCsv(samples)}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveToDisk(blob, `performance-${packageName}-${timestampForFilename()}.csv`);
}
