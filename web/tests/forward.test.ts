import type { AdbServerClient } from '@yume-chan/adb';
import { describe, expect, it } from 'vitest';
import {
  addForwardRule,
  listForwardRules,
  normalizeForwardDeviceAddress,
  normalizeForwardHostAddress,
  parseForwardList,
  removeAllForwardRules,
  removeForwardRule,
} from '@/lib/adb/forward';

interface RecordedClient {
  client: AdbServerClient;
  services: string[];
  options: unknown[];
}

function fakeClient(payload = ''): RecordedClient {
  const services: string[] = [];
  const options: unknown[] = [];
  const stream = { readString: async () => payload, dispose: async () => {} };
  const client = {
    createConnection: async (service: string, connectionOptions?: unknown) => {
      services.push(service);
      options.push(connectionOptions);
      return stream;
    },
  } as unknown as AdbServerClient;
  return { client, services, options };
}

describe('forward address normalization', () => {
  it('accepts host ports and the tcp:0 auto allocation', () => {
    expect(normalizeForwardHostAddress('8080')).toBe('tcp:8080');
    expect(normalizeForwardHostAddress(' tcp:5555 ')).toBe('tcp:5555');
    expect(normalizeForwardHostAddress('0')).toBe('tcp:0');
  });

  it('rejects malformed or out-of-range host ports', () => {
    expect(() => normalizeForwardHostAddress('')).toThrow();
    expect(() => normalizeForwardHostAddress('abc')).toThrow();
    expect(() => normalizeForwardHostAddress('65536')).toThrow();
    expect(() => normalizeForwardHostAddress('udp:8080')).toThrow();
  });

  it('accepts every device-side scheme adb can forward to', () => {
    expect(normalizeForwardDeviceAddress('9090')).toBe('tcp:9090');
    expect(normalizeForwardDeviceAddress('localabstract:scrcpy')).toBe('localabstract:scrcpy');
    expect(normalizeForwardDeviceAddress('localfilesystem:/dev/socket/logdr')).toBe(
      'localfilesystem:/dev/socket/logdr'
    );
    expect(normalizeForwardDeviceAddress('jdwp:1234')).toBe('jdwp:1234');
  });

  it('rejects whitespace, zero ports and unknown schemes on the device side', () => {
    expect(() => normalizeForwardDeviceAddress('localabstract:bad name')).toThrow();
    expect(() => normalizeForwardDeviceAddress('tcp:0')).toThrow();
    expect(() => normalizeForwardDeviceAddress('tcp:8080:extra')).toThrow();
  });
});

describe('forward list parsing', () => {
  it('reads serial/local/remote rows and skips noise', () => {
    const text = 'emulator-5554 tcp:8000 tcp:9000\nR58M12\ttcp:0 localabstract:devtools\n\nbroken\n';
    expect(parseForwardList(text)).toEqual([
      { serial: 'emulator-5554', local: 'tcp:8000', remote: 'tcp:9000' },
      { serial: 'R58M12', local: 'tcp:0', remote: 'localabstract:devtools' },
    ]);
  });

  it('returns nothing for an empty reply', () => {
    expect(parseForwardList('')).toEqual([]);
  });
});

describe('forward services over the ADB Server bridge', () => {
  it('lists the rules of one device', async () => {
    const { client, services } = fakeClient('emulator-5554 tcp:8000 tcp:9000\n');
    await expect(listForwardRules(client, 'emulator-5554')).resolves.toEqual([
      { serial: 'emulator-5554', local: 'tcp:8000', remote: 'tcp:9000' },
    ]);
    expect(services).toEqual(['host-serial:emulator-5554:list-forward']);
  });

  it('keeps the requested host address when the server replies without a payload', async () => {
    const { client, services } = fakeClient();
    await expect(addForwardRule(client, 'emulator-5554', 'tcp:8000', 'tcp:9000')).resolves.toBe('tcp:8000');
    expect(services).toEqual(['host-serial:emulator-5554:forward:tcp:8000:tcp:9000']);
  });

  it('reports the port the server assigned for tcp:0', async () => {
    const { client } = fakeClient('41234');
    await expect(addForwardRule(client, 'emulator-5554', 'tcp:0', 'tcp:9000')).resolves.toBe('tcp:41234');
  });

  it('removes one rule and clears them all', async () => {
    const single = fakeClient();
    await removeForwardRule(single.client, 'emulator-5554', 'tcp:8000');
    const all = fakeClient();
    await removeAllForwardRules(all.client, 'emulator-5554');
    expect(single.services).toEqual(['host-serial:emulator-5554:killforward:tcp:8000']);
    expect(all.services).toEqual(['host-serial:emulator-5554:killforward-all']);
  });

  it('validates the addresses before touching the connection', async () => {
    const { client, services } = fakeClient();
    await expect(addForwardRule(client, 'emulator-5554', 'tcp:8000', 'tcp:9000\ninjected')).rejects.toThrow();
    await expect(removeForwardRule(client, 'emulator-5554', 'localabstract:nope')).rejects.toThrow();
    expect(services).toEqual([]);
  });

  it('rejects serials that could break the service string but keeps IPv6 ones', async () => {
    const { client, services } = fakeClient();
    await expect(listForwardRules(client, 'bad serial')).rejects.toThrow();
    await expect(listForwardRules(client, 'bad\nserial')).rejects.toThrow();
    await listForwardRules(client, '[fe80::1]:5555');
    expect(services).toEqual(['host-serial:[fe80::1]:5555:list-forward']);
  });

  it('forwards the abort signal to the connection', async () => {
    const controller = new AbortController();
    const { client, options } = fakeClient();
    await listForwardRules(client, 'emulator-5554', { signal: controller.signal });
    expect(options).toEqual([{ signal: controller.signal }]);
  });
});
