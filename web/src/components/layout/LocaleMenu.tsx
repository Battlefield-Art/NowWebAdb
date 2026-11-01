import { Check, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LOCALES, LOCALE_LABELS, setLocale, useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';

export function LocaleMenu({ className }: { className?: string }) {
  const t = useT();
  const locale = useLocale();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('gap-1 text-muted hover:text-ink', className)}
          aria-label={t('layout.language')}
          title={t('layout.language')}
        >
          <Languages />
          <span className="font-mono text-[10.5px] font-semibold tracking-wide">
            {locale === 'zh-CN' ? '中' : 'EN'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('layout.language')}</DropdownMenuLabel>
        {LOCALES.map(value => (
          <DropdownMenuItem key={value} onSelect={() => setLocale(value)}>
            <span className="flex-1">{LOCALE_LABELS[value]}</span>
            {locale === value ? <Check className="size-3.5 text-accent" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
