import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { setLocale, useT } from '@/lib/i18n';

function Probe() {
  const t = useT();
  return <p>{t('common.cancel')}</p>;
}

describe('useT', () => {
  it('re-renders subscribers when the locale changes', () => {
    render(<Probe />);
    expect(screen.getByText('取消')).toBeInTheDocument();
    act(() => setLocale('en-US'));
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    act(() => setLocale('zh-CN'));
  });
});
