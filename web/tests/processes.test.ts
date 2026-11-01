import { describe, expect, it } from 'vitest';
import { parseProcessList } from '@/lib/adb/processes';

describe('parseProcessList', () => {
  it('parses toybox ps -A -o output and converts RSS to bytes', () => {
    const output = [
      'USER           PID   PPID    RSS  NAME',
      'root             1      0   1234  init',
      'system        1052    291  25760  system_server',
      'u0_a132       5121   1052  98765  com.example.app',
      '',
    ].join('\n');

    expect(parseProcessList(output)).toEqual([
      { user: 'root', pid: 1, ppid: 0, rss: 1234 * 1024, name: 'init' },
      { user: 'system', pid: 1052, ppid: 291, rss: 25760 * 1024, name: 'system_server' },
      { user: 'u0_a132', pid: 5121, ppid: 1052, rss: 98765 * 1024, name: 'com.example.app' },
    ]);
  });

  it('parses legacy toolbox output with extra columns before NAME', () => {
    const output = [
      'USER     PID   PPID  VSZ   RSS  WCHAN     ADDR  S  NAME',
      'root     1     0     8800  1844 ffffffff 00000000 S /init',
      'shell    3341  200   14320 2512 0        00000000 S ps',
    ].join('\n');

    const processes = parseProcessList(output);
    expect(processes).toHaveLength(2);
    expect(processes[0]).toEqual({
      user: 'root',
      pid: 1,
      ppid: 0,
      rss: 1844 * 1024,
      name: '/init',
    });
    expect(processes[1]?.name).toBe('ps');
    expect(processes[1]?.ppid).toBe(200);
  });

  it('tolerates a header without optional columns', () => {
    const output = ['USER PID PPID RSS NAME', 'root 1 0 512 init', 'root 2 1 0 kthreadd'].join('\n');
    const processes = parseProcessList(output);
    expect(processes.map(process => process.pid)).toEqual([1, 2]);
    expect(processes[1]?.rss).toBe(0);
  });

  it('returns an empty list for malformed or headerless output', () => {
    expect(parseProcessList('')).toEqual([]);
    expect(parseProcessList('not a process table\nanother line')).toEqual([]);
    expect(parseProcessList('PID NAME')).toEqual([]);
    expect(parseProcessList('USER PID PPID RSS\nroot 1 0 512\n')).toEqual([]);
  });

  it('skips rows with invalid pids', () => {
    const output = ['USER PID PPID RSS NAME', 'root 1 0 512 init', 'root 0 0 0 idle', 'root abc 0 0 bad'].join('\n');
    expect(parseProcessList(output).map(process => process.pid)).toEqual([1]);
  });
});
