import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { InstallDialog } from '@/features/apps/InstallDialog';

const LABELS = ['覆盖安装', '允许降级', '授予权限', '测试包', '内部存储'];

function renderDialog() {
  return render(
    <InstallDialog adb={null} open onOpenChange={() => undefined} onInstalled={() => undefined} />,
  );
}

describe('install dialog advanced options', () => {
  it('renders every install flag unchecked by default', () => {
    renderDialog();
    expect(screen.getByText('安装选项')).toBeInTheDocument();
    for (const label of LABELS) {
      expect(screen.getByRole('checkbox', { name: label })).not.toBeChecked();
    }
    expect(screen.getByRole('button', { name: '开始安装' })).toBeDisabled();
  });

  it('toggles a flag without enabling install when no files are selected', async () => {
    const user = userEvent.setup();
    renderDialog();
    const overwrite = screen.getByRole('checkbox', { name: '覆盖安装' });
    await user.click(overwrite);
    expect(overwrite).toBeChecked();
    expect(screen.getByRole('button', { name: '开始安装' })).toBeDisabled();
  });
});
