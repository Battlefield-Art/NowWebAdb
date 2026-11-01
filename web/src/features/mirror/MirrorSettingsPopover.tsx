import { useCallback, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '@/lib/i18n';
import { normalizeScrcpySettings, type ScrcpySettings } from '@/lib/adb/scrcpySettings';
import { toErrorMessage } from '@/lib/utils/format';
import { MirrorAudioPanel } from './MirrorAudioPanel';
import { MirrorDevicePanel } from './MirrorDevicePanel';
import { MirrorVideoPanel } from './MirrorVideoPanel';
import { fromMirrorDraft, toMirrorDraft, type MirrorDraft, type MirrorTab } from './mirrorDraft';
import { ToolbarButton } from './ToolbarButton';

export interface MirrorSettingsPopoverProps {
  adb: Adb | null;
  settings: ScrcpySettings;
  onApply: (settings: ScrcpySettings) => void;
  onPickCrop?: () => void;
}

export function MirrorSettingsPopover({ adb, settings, onApply, onPickCrop }: MirrorSettingsPopoverProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<MirrorTab>('video');
  const [draft, setDraft] = useState(() => toMirrorDraft(settings));
  const [error, setError] = useState('');

  const patch = useCallback((value: Partial<MirrorDraft>) => {
    setDraft(current => ({ ...current, ...value }));
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraft(toMirrorDraft(settings));
      setTab('video');
      setError('');
    }
    setOpen(next);
  };

  const apply = () => {
    try {
      const next = normalizeScrcpySettings(fromMirrorDraft(draft));
      onApply(next);
      setOpen(false);
    } catch (cause) {
      setError(toErrorMessage(cause));
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <ToolbarButton title={t('mirror.settings.title')} aria-label={t('mirror.settings.title')}>
          <Settings2 className="size-[18px]" />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        collisionPadding={12}
        className="flex max-h-[min(var(--radix-popover-content-available-height,80dvh),640px)] w-[344px] flex-col overflow-hidden p-0"
      >
        <div className="px-3 pb-2 pt-3">
          <p className="text-[12.5px] font-semibold text-ink">{t('mirror.settings.title')}</p>
          <p className="mt-0.5 text-[11px] text-muted">{t('mirror.settings.reopenHint')}</p>
        </div>

        <Tabs
          value={tab}
          onValueChange={value => setTab(value as MirrorTab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="mx-3 border-b border-line-soft pb-1">
            <TabsTrigger value="video">{t('mirror.settings.tabVideo')}</TabsTrigger>
            <TabsTrigger value="audio">{t('mirror.settings.tabAudio')}</TabsTrigger>
            <TabsTrigger value="device">{t('mirror.settings.tabDevice')}</TabsTrigger>
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <TabsContent value="video">
              <MirrorVideoPanel
                adb={adb}
                draft={draft}
                patch={patch}
                onPickCrop={onPickCrop
                  ? () => {
                      setOpen(false);
                      onPickCrop();
                    }
                  : undefined}
              />
            </TabsContent>
            <TabsContent value="audio">
              <MirrorAudioPanel draft={draft} patch={patch} />
            </TabsContent>
            <TabsContent value="device">
              <MirrorDevicePanel draft={draft} patch={patch} />
            </TabsContent>
          </div>
        </Tabs>

        <div className="border-t border-line-soft px-3 py-2.5">
          {error ? <p className="mb-2 text-[11px] leading-relaxed text-danger">{error}</p> : null}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10.5px] text-muted-2">{t('mirror.settings.autoReconnect')}</span>
            <Button size="sm" variant="primary" onClick={apply}>
              {t('mirror.settings.saveReconnect')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
