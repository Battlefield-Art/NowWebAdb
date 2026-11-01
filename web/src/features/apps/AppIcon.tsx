import { cn } from '@/lib/utils/cn';

function hueOf(packageName: string): number {
  let hash = 0;
  for (let index = 0; index < packageName.length; index += 1) {
    hash = (hash * 31 + packageName.charCodeAt(index)) % 360;
  }
  return hash;
}

export interface AppIconProps {
  packageName: string;
  label: string;
  src?: string | undefined;
  className?: string;
}

export function AppIcon({ packageName, label, src, className }: AppIconProps) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        draggable={false}
        className={cn('size-8 shrink-0 rounded-[9px] bg-white object-contain ring-1 ring-line-soft', className)}
      />
    );
  }
  const hue = hueOf(packageName);
  const initial = (label.trim()[0] || packageName[0] || '?').toUpperCase();
  return (
    <span
      aria-hidden
      className={cn('grid size-8 shrink-0 place-items-center rounded-[9px] text-[12px] font-bold', className)}
      style={{ backgroundColor: `hsl(${hue} 52% 92%)`, color: `hsl(${hue} 42% 32%)` }}
    >
      {initial}
    </span>
  );
}
