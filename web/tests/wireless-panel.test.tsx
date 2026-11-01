import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AdbServerClient } from '@yume-chan/adb';
import { describe, expect, it, vi } from 'vitest';
import { WirelessPanel } from '@/features/home/WirelessPanel';
import type { ConnectionTask } from '@/features/home/useConnectionTask';

function createTask(run = vi.fn(async () => undefined)): ConnectionTask {
  return {
    busy: false,
    status: '',
    error: '',
    run,
    cancel: () => undefined,
    clearError: () => undefined,
  };
}

const client = () => ({}) as AdbServerClient;

describe('wireless pairing panel', () => {
  it('requires a valid pairing address and a six-digit code', async () => {
    const user = userEvent.setup();
    const run = vi.fn(async () => undefined);
    render(<WirelessPanel task={createTask(run)} getClient={client} onChanged={async () => undefined} />);

    const pair = screen.getByRole('button', { name: '配对并连接' });
    expect(pair).toBeDisabled();

    await user.type(screen.getByLabelText('配对地址'), '192.168.1.20:37123');
    await user.type(screen.getByLabelText('配对码'), '123');
    expect(pair).toBeDisabled();

    await user.type(screen.getByLabelText('配对码'), '456');
    expect(pair).toBeEnabled();

    await user.click(pair);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('only enables connect for a complete address', async () => {
    const user = userEvent.setup();
    render(<WirelessPanel task={createTask()} getClient={client} onChanged={async () => undefined} />);

    const connect = screen.getByRole('button', { name: '连接设备' });
    expect(connect).toBeDisabled();

    await user.type(screen.getByLabelText('连接地址'), '192.168.1.20');
    expect(connect).toBeDisabled();

    await user.type(screen.getByLabelText('连接地址'), ':5555');
    expect(connect).toBeEnabled();
  });
});
