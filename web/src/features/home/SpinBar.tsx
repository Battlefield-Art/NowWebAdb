import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { ConnectionTask } from '@/features/home/useConnectionTask';
import { useT } from '@/lib/i18n';

export function SpinBar({ task }: { task: ConnectionTask }) {
  const t = useT();
  if (!task.busy && !task.error) return null;
  if (task.error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-[9px] border border-danger/25 bg-danger-soft px-3 py-2 text-[11.5px] leading-relaxed text-danger"
      >
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <p className="flex-1">{task.error}</p>
        <button
          type="button"
          onClick={task.clearError}
          aria-label={t('home.spin.dismiss')}
          className="rounded p-0.5 text-danger/70 transition-colors hover:text-danger"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 rounded-[9px] border border-accent-line bg-accent-soft px-3 py-2 text-[11.5px] font-medium text-accent-ink"
    >
      <Spinner className="size-3.5" />
      <p className="flex-1">{task.status}</p>
      <Button variant="ghost" size="sm" className="text-accent-ink hover:bg-accent/10" onClick={task.cancel}>
        {t('common.cancel')}
      </Button>
    </div>
  );
}
