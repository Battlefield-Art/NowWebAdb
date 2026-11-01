import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AdbServerClient } from '@yume-chan/adb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForwardPanel } from '@/features/connection/ForwardPanel';
import { addForwardRule, removeForwardRule, type ForwardRule } from '@/lib/adb/forward';

vi.mock('@/lib/adb/forward', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/adb/forward')>();
  return { ...actual, addForwardRule: vi.fn(), removeForwardRule: vi.fn(), removeAllForwardRules: vi.fn() };
});

const client = {} as AdbServerClient;
const rules: ForwardRule[] = [
  { serial: 'emulator-5554', local: 'tcp:8000', remote: 'tcp:9000' },
  { serial: 'emulator-5554', local: 'tcp:41234', remote: 'localabstract:devtools' },
];

function renderPanel(overrides: Partial<Parameters<typeof ForwardPanel>[0]> = {}) {
  const props = { server: client, serial: 'emulator-5554', rules, error: '', onChanged: vi.fn(), ...overrides };
  render(<ForwardPanel {...props} />);
  return props;
}

beforeEach(() => {
  vi.mocked(addForwardRule).mockReset().mockResolvedValue('tcp:8000');
  vi.mocked(removeForwardRule).mockReset().mockResolvedValue(undefined);
});

describe('host forwarding panel', () => {
  it('explains that a direct connection has no host listener', () => {
    renderPanel({ server: null, rules: [] });
    expect(screen.getByText('暂无本机转发')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '建立' })).toBeNull();
  });

  it('creates a rule from normalized addresses and asks for a refresh', async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    await user.clear(screen.getByLabelText('本机端口'));
    await user.type(screen.getByLabelText('本机端口'), '8000');
    await user.clear(screen.getByLabelText('设备地址'));
    await user.type(screen.getByLabelText('设备地址'), 'tcp:9000');
    await user.click(screen.getByRole('button', { name: '建立' }));

    expect(addForwardRule).toHaveBeenCalledWith(client, 'emulator-5554', 'tcp:8000', 'tcp:9000');
    expect(props.onChanged).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid host port before calling the server', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.clear(screen.getByLabelText('本机端口'));
    await user.type(screen.getByLabelText('本机端口'), '70000');
    await user.click(screen.getByRole('button', { name: '建立' }));

    expect(addForwardRule).not.toHaveBeenCalled();
  });

  it('lists every rule and removes one by its host address', async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    expect(screen.getByText('2 条')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: '移除转发' })[1]!);

    expect(removeForwardRule).toHaveBeenCalledWith(client, 'emulator-5554', 'tcp:41234');
    expect(props.onChanged).toHaveBeenCalledTimes(1);
  });
});
