import { useEffect, useState } from 'react';
import type { AdbServerClient } from '@yume-chan/adb';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useT } from '@/lib/i18n';
import {
  describeServerError,
  readServerDeviceFeatures,
  type ServerDevice,
} from '@/lib/connection/server';

export interface ServerFeaturesDialogProps {
  client: () => AdbServerClient;
  device: ServerDevice | null;
  onOpenChange: (open: boolean) => void;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export function ServerFeaturesDialog({ client, device, onOpenChange }: ServerFeaturesDialogProps) {
  const t = useT();
  const [features, setFeatures] = useState<readonly string[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!device) return;
    let active = true;
    void (async () => {
      setFeatures([]);
      setState('loading');
      setError('');
      try {
        const result = await readServerDeviceFeatures(client(), device.serial);
        if (!active) return;
        setFeatures(result.features);
        setState('ready');
      } catch (cause) {
        if (!active) return;
        setError(describeServerError(cause));
        setState('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [client, device]);

  return (
    <Dialog open={device !== null} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(560px,94vw)]">
        <DialogHeader>
          <DialogTitle>{t('home.serverFeatures.title')}</DialogTitle>
          <DialogDescription>
            {device ? t('home.serverFeatures.description', { serial: device.serial }) : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {state === 'loading' ? (
            <div className="flex items-center gap-2 text-[11.5px] text-muted">
              <Spinner className="size-3.5" />
              {t('home.serverFeatures.loading')}
            </div>
          ) : state === 'error' ? (
            <p className="text-[11.5px] leading-relaxed text-danger">{error}</p>
          ) : features.length ? (
            <div className="flex max-h-[46vh] flex-wrap gap-1.5 overflow-y-auto">
              {features.map(feature => (
                <Badge key={feature} tone="neutral">
                  <span className="font-mono text-[10.5px]">{feature}</span>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-[11.5px] leading-relaxed text-muted">{t('home.serverFeatures.empty')}</p>
          )}
          <p className="mt-3 text-[10.5px] leading-relaxed text-muted-2">
            {t('home.serverFeatures.note')}
          </p>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
