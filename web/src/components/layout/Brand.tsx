import { cn } from '@/lib/utils/cn';

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="grid size-7 place-items-center rounded-[8px] bg-ink text-[13px] font-black text-surface">
        N
      </span>
      <div className="leading-none">
        <p className="text-[13.5px] font-bold tracking-[-0.02em] text-ink">NowWebAdb</p>
        {compact ? null : (
          <p className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.14em] text-muted-2 sm:block">
            browser adb workspace
          </p>
        )}
      </div>
    </div>
  );
}
