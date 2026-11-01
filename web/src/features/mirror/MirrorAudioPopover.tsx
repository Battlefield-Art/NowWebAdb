import { Headphones, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useT } from '@/lib/i18n';
import { ToolbarButton } from './ToolbarButton';

export interface MirrorAudioPopoverProps {
  enabled: boolean;
  ready: boolean;
  status: string;
  onResume: () => void;
}

export function MirrorAudioPopover({ enabled, ready, status, onResume }: MirrorAudioPopoverProps) {
  const t = useT();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <ToolbarButton
          active={enabled}
          title={t('mirror.audioPopover.title')}
          aria-label={t('mirror.audioPopover.title')}
        >
          <Headphones className="size-[18px]" />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-[270px]">
        <div className="grid gap-2">
          <p className="text-[12.5px] font-semibold text-ink">{t('mirror.audioPopover.title')}</p>
          <p className="text-[11.5px] leading-relaxed text-muted">{status}</p>
          {!enabled ? (
            <p className="text-[11px] leading-relaxed text-muted-2">{t('mirror.audioPopover.disabledHint')}</p>
          ) : (
            <Button size="sm" variant="outline" disabled={!ready} onClick={onResume}>
              <Play />
              {t('mirror.audioPopover.play')}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
