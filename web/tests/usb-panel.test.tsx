import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UsbPanel } from '@/features/home/UsbPanel';
import type { ConnectionTask } from '@/features/home/useConnectionTask';
import { usbBusyMessage } from '@/lib/connection/usb';

function makeTask(error: string): ConnectionTask {
  return { busy: false, status: '', error, run: vi.fn(), cancel: vi.fn(), clearError: vi.fn() };
}

function renderPanel(task: ConnectionTask, onSwitchToBridge = vi.fn()) {
  render(
    <UsbPanel
      devices={[]}
      task={task}
      autoConnect={false}
      onAutoConnectChange={vi.fn()}
      onRefresh={async () => undefined}
      onPick={vi.fn()}
      onConnect={vi.fn()}
      onSwitchToBridge={onSwitchToBridge}
    />,
  );
  return onSwitchToBridge;
}

describe('UsbPanel busy handling', () => {
  it('offers the bridge when the USB device is exclusively held', async () => {
    const onSwitchToBridge = renderPanel(makeTask(usbBusyMessage()));
    await userEvent.click(screen.getByRole('button', { name: /改用桥接服务/ }));
    expect(onSwitchToBridge).toHaveBeenCalledOnce();
  });

  it('keeps unrelated errors free of the bridge shortcut', () => {
    renderPanel(makeTask('操作超时；请检查设备授权'));
    expect(screen.queryByRole('button', { name: /改用桥接服务/ })).toBeNull();
  });
});
