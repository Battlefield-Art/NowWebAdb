import { useState } from 'react';
import { ClipboardCopy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useT } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';
import { ToolbarButton } from './ToolbarButton';

const INPUT_CLASS =
  'w-full resize-y rounded-control border border-line-strong bg-surface px-2 py-1.5 text-[12px] leading-relaxed text-ink outline-none transition-colors focus:border-accent';

export interface MirrorClipboardPopoverProps {
  ready: boolean;
  deviceClipboard: string;
  onSend: (text: string) => Promise<boolean>;
}

export function MirrorClipboardPopover({ ready, deviceClipboard, onSend }: MirrorClipboardPopoverProps) {
  const t = useT();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (value: string) => {
    if (!value || busy) return;
    setBusy(true);
    try {
      const ok = await onSend(value);
      if (ok) toast.success(t('mirror.clipboard.sent'));
      else toast.error(t('mirror.clipboard.notConnected'));
    } finally {
      setBusy(false);
    }
  };

  const pasteDevice = async () => {
    try {
      const value = await navigator.clipboard.readText();
      if (!value) toast.warning(t('mirror.clipboard.emptyLocal'));
      else await send(value);
    } catch (cause) {
      toast.error(t('mirror.clipboard.readFailed', { error: toErrorMessage(cause) }));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <ToolbarButton title={t('mirror.clipboard.title')} aria-label={t('mirror.clipboard.title')}>
          <ClipboardCopy className="size-[18px]" />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-[320px]">
        <div className="grid gap-2">
          <p className="text-[12.5px] font-semibold text-ink">{t('mirror.clipboard.title')}</p>
          <textarea
            className={INPUT_CLASS}
            rows={3}
            value={text}
            placeholder={t('mirror.clipboard.placeholder')}
            aria-label={t('mirror.clipboard.inputAria')}
            onChange={event => setText(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send(text);
              }
            }}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" disabled={!ready || !text || busy} onClick={() => void send(text)}>
              {t('mirror.clipboard.sendPaste')}
            </Button>
            <Button size="sm" variant="outline" disabled={!ready || busy} onClick={() => void pasteDevice()}>
              {t('mirror.clipboard.pasteLocal')}
            </Button>
          </div>
          {deviceClipboard ? (
            <div className="grid gap-1.5 border-t border-line-soft pt-2">
              <span className="text-[11px] font-semibold text-muted">{t('mirror.clipboard.deviceLabel')}</span>
              <textarea
                className={INPUT_CLASS}
                rows={3}
                value={deviceClipboard}
                readOnly
                aria-label={t('mirror.clipboard.deviceAria')}
              />
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
