import { useEffect, useRef } from 'react';
import { ArrowUp, ChevronRight, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { remotePathSegments } from '@/lib/adb/paths';
import { cn } from '@/lib/utils/cn';
import { t } from '@/lib/i18n';

export interface FileBreadcrumbProps {
  path: string;
  disabled?: boolean;
  onNavigate: (path: string) => void;
  onUp: () => void;
}

export function FileBreadcrumb({ path, disabled, onNavigate, onUp }: FileBreadcrumbProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const segments = remotePathSegments(path);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, [path]);

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('files.breadcrumb.up')}
        title={t('files.breadcrumb.up')}
        disabled={disabled || path === '/'}
        onClick={onUp}
      >
        <ArrowUp />
      </Button>
      <div ref={scrollRef} className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
        {segments.map((segment, index) => {
          const last = index === segments.length - 1;
          return (
            <span key={segment.path} className="flex shrink-0 items-center gap-0.5">
              {index > 0 ? <ChevronRight className="size-3 shrink-0 text-muted-2" /> : null}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onNavigate(segment.path)}
                className={cn(
                  'inline-flex h-6 items-center gap-1 rounded px-1.5 font-mono text-[11.5px] transition-colors',
                  last ? 'font-semibold text-ink' : 'text-muted hover:bg-surface-3 hover:text-ink',
                  'disabled:pointer-events-none disabled:opacity-50',
                )}
                title={segment.path}
              >
                {index === 0 ? <HardDrive className="size-3" /> : null}
                {index === 0 ? t('files.breadcrumb.root') : segment.name}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
