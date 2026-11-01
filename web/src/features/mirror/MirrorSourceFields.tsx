import { useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import type { ScrcpyDisplay, ScrcpyEncoder } from '@yume-chan/scrcpy';
import { ScanSearch } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useT } from '@/lib/i18n';
import type { ScrcpyVideoCodec } from '@/lib/adb/scrcpySettings';
import { listScrcpyDisplays, listScrcpyEncoders } from '@/lib/adb/scrcpyProbe';
import { cn } from '@/lib/utils/cn';
import { toErrorMessage } from '@/lib/utils/format';

const INPUT_CLASS =
  'h-8 w-full rounded-control border border-line-strong bg-surface px-2 text-[12px] text-ink outline-none transition-colors focus:border-accent';

const CHIP_CLASS =
  'inline-flex max-w-full items-center truncate rounded-full border border-line bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-muted transition-colors hover:border-accent hover:text-accent-ink';

const HARDWARE_KEY = {
  hardware: 'mirror.source.hardware',
  software: 'mirror.source.software',
  hybrid: 'mirror.source.hybrid',
} as const;

export interface MirrorSourceFieldsProps {
  adb: Adb | null;
  codec: ScrcpyVideoCodec;
  displayId: string;
  encoder: string;
  onDisplayIdChange: (value: string) => void;
  onEncoderChange: (value: string) => void;
}

export function MirrorSourceFields({
  adb,
  codec,
  displayId,
  encoder,
  onDisplayIdChange,
  onEncoderChange,
}: MirrorSourceFieldsProps) {
  const t = useT();
  const [probing, setProbing] = useState(false);
  const [displays, setDisplays] = useState<ScrcpyDisplay[]>([]);
  const [encoders, setEncoders] = useState<ScrcpyEncoder[]>([]);
  const [error, setError] = useState('');

  const probe = async (): Promise<void> => {
    if (!adb || probing) return;
    setProbing(true);
    setError('');
    try {
      const nextDisplays = await listScrcpyDisplays(adb);
      setDisplays(nextDisplays);
      const nextEncoders = await listScrcpyEncoders(adb);
      setEncoders(nextEncoders);
      toast.success(t('mirror.source.probed', {
        displays: nextDisplays.length,
        encoders: nextEncoders.length,
      }));
    } catch (cause) {
      setError(toErrorMessage(cause));
    } finally {
      setProbing(false);
    }
  };

  const videoEncoders = encoders.filter(item => item.type === 'video' && (!item.codec || item.codec === codec));

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-muted">{t('mirror.source.title')}</span>
        <Button size="sm" variant="ghost" disabled={!adb || probing} onClick={() => void probe()}>
          {probing ? <Spinner className="size-3" /> : <ScanSearch />}
          {probing ? t('mirror.camera.probing') : t('mirror.camera.probe')}
        </Button>
      </div>

      <label className="grid grid-cols-[1fr_92px] items-center gap-2">
        <span className="text-[11.5px] text-muted">{t('mirror.source.displayId')}</span>
        <input
          type="number"
          inputMode="numeric"
          className={INPUT_CLASS}
          value={displayId}
          min={0}
          max={4096}
          onChange={event => onDisplayIdChange(event.target.value)}
          aria-label={t('mirror.source.displayId')}
        />
      </label>
      {displays.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {displays.map(display => (
            <button
              key={display.id}
              type="button"
              className={cn(CHIP_CLASS, Number(displayId) === display.id && 'border-accent bg-accent-soft text-accent-ink')}
              onClick={() => onDisplayIdChange(String(display.id))}
            >
              #{display.id}
              {display.resolution ? ` · ${display.resolution}` : ''}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-1">
        <span className="text-[11.5px] text-muted">{t('mirror.source.encoder')}</span>
        <input
          className={INPUT_CLASS}
          value={encoder}
          placeholder={t('mirror.source.encoderPlaceholder')}
          aria-label={t('mirror.source.encoder')}
          onChange={event => onEncoderChange(event.target.value)}
        />
      </div>
      {videoEncoders.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={cn(CHIP_CLASS, encoder === '' && 'border-accent bg-accent-soft text-accent-ink')}
            onClick={() => onEncoderChange('')}
          >
            {t('mirror.source.auto')}
          </button>
          {videoEncoders.map(item => (
            <button
              key={item.name}
              type="button"
              title={item.hardwareType
                ? t('mirror.source.hardwareEncoder', { type: t(HARDWARE_KEY[item.hardwareType]) })
                : item.name}
              className={cn(CHIP_CLASS, encoder === item.name && 'border-accent bg-accent-soft text-accent-ink')}
              onClick={() => onEncoderChange(item.name)}
            >
              {item.name}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-[11px] leading-relaxed text-danger">{error}</p> : null}
    </div>
  );
}
