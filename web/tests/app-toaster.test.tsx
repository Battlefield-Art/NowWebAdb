import { render, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import App from '@/App';
import { setLocale } from '@/lib/i18n';

const LABELS = {
  'zh-CN': { region: '通知', close: '关闭通知' },
  'en-US': { region: 'Notifications', close: 'Dismiss notification' },
} as const;

describe('toast accessibility labels', () => {
  afterEach(() => {
    toast.dismiss();
    setLocale('zh-CN');
  });

  for (const locale of ['zh-CN', 'en-US'] as const) {
    it(`labels the toast region and close button in ${locale}`, async () => {
      setLocale(locale);
      const { container } = render(<App />);
      toast.error('boom');
      await waitFor(() => {
        // Sonner appends its dismiss hotkey to the region label, so match the localized prefix.
        expect(container.querySelector(`[aria-label^="${LABELS[locale].region}"]`)).toBeTruthy();
        expect(container.querySelector(`button[aria-label="${LABELS[locale].close}"]`)).toBeTruthy();
      });
    });
  }
});
