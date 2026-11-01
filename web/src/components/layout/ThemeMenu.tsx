import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useT } from '@/lib/i18n';
import { setThemePreference, useResolvedTheme, useThemePreference } from '@/lib/theme';
import { cn } from '@/lib/utils/cn';

const OPTIONS = [
  { value: 'light', labelKey: 'layout.appearance.light', icon: Sun },
  { value: 'dark', labelKey: 'layout.appearance.dark', icon: Moon },
  { value: 'system', labelKey: 'layout.appearance.system', icon: Monitor },
] as const;

export function ThemeMenu({ className }: { className?: string }) {
  const t = useT();
  const preference = useThemePreference();
  const resolved = useResolvedTheme();
  const TriggerIcon = resolved === 'dark' ? Moon : Sun;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn('text-muted hover:text-ink', className)}
          aria-label={t('layout.appearance')}
          title={t('layout.appearance')}
        >
          <TriggerIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('layout.appearance')}</DropdownMenuLabel>
        {OPTIONS.map(option => {
          const OptionIcon = option.icon;
          return (
            <DropdownMenuItem key={option.value} onSelect={() => setThemePreference(option.value)}>
              <OptionIcon className="size-3.5 text-muted" />
              <span className="flex-1">{t(option.labelKey)}</span>
              {preference === option.value ? <Check className="size-3.5 text-accent" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
