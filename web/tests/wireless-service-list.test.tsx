import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MdnsServiceList } from '@/features/home/MdnsServiceList';
import type { MdnsService } from '@/lib/connection/server';

const SERVICES: MdnsService[] = [
  { name: 'Pixel-8 pairing', service: '_adb-tls-pairing._tcp.', address: '192.168.1.20:37123', kind: 'pairing' },
  { name: 'Pixel-8 connect', service: '_adb-tls-connect._tcp.', address: '192.168.1.20:37891', kind: 'connect' },
  { name: 'printer', service: '_ipp._tcp.', address: '192.168.1.20:631', kind: 'other' },
];

describe('mDNS service list', () => {
  it('shows the discovery note when nothing is found', () => {
    render(<MdnsServiceList services={[]} note="未发现服务" onPick={() => undefined} />);
    expect(screen.getByText('未发现服务')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '填入' })).not.toBeInTheDocument();
  });

  it('offers direct connect for connect services and fill for pairing services', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const onConnect = vi.fn();
    render(<MdnsServiceList services={SERVICES} note="" onPick={onPick} onConnect={onConnect} />);

    await user.click(screen.getByRole('button', { name: '连接' }));
    expect(onConnect).toHaveBeenCalledWith(SERVICES[1]);

    const fills = screen.getAllByRole('button', { name: '填入' });
    await user.click(fills[0] as HTMLElement);
    expect(onPick).toHaveBeenCalledWith(SERVICES[0]);
    expect(fills[2]).toBeDisabled();
  });

  it('disables row actions while a connection task is running', () => {
    render(<MdnsServiceList services={SERVICES} note="" busy onPick={() => undefined} onConnect={() => undefined} />);
    expect(screen.getByRole('button', { name: '连接' })).toBeDisabled();
    for (const button of screen.getAllByRole('button', { name: '填入' })) {
      expect(button).toBeDisabled();
    }
  });
});
