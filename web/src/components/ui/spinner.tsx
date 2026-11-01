import { LoaderCircle } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';

export function Spinner({ className, label }: { className?: string; label?: string }) {
  const t = useT();
  return (
    <span role="status" aria-label={label ?? t('common.loading')} className="inline-flex">
      <LoaderCircle className={cn('size-3.5 animate-spin text-accent', className)} strokeWidth={2.4} />
    </span>
  );
}
