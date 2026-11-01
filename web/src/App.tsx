import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppRoutes } from './router';
import { t, useLocale } from '@/lib/i18n';

export default function App() {
  // Nothing in the tree is memoized, so re-rendering here repaints every module-level t() call.
  useLocale();
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster
        position="bottom-right"
        closeButton
        containerAriaLabel={t('common.toast.region')}
        toastOptions={{
          className: '!rounded-[10px] !border !border-line !bg-surface !text-ink !text-[12.5px] !shadow-float',
          closeButtonAriaLabel: t('common.toast.close'),
        }}
      />
    </BrowserRouter>
  );
}
