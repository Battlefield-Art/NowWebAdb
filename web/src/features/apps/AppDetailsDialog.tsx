import { useEffect, useRef, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import type { InstalledApp } from '@/lib/adb/packages';
import { readPackageDetails } from '@/lib/adb/packages';
import { useT } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';
import { AppIcon } from './AppIcon';
import { isSystemApp } from './appUtils';
import type { AppMetadata } from './metadata';

const DISPLAY_LIMIT = 160_000;

export interface AppDetailsDialogProps {
  adb: Adb | null;
  app: InstalledApp | null;
  metadata: AppMetadata | undefined;
  onOpenChange: (open: boolean) => void;
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line-soft py-1.5 last:border-0">
      <dt className="shrink-0 text-[11px] text-muted">{label}</dt>
      <dd
        className={`min-w-0 truncate text-right text-[11.5px] text-ink-soft ${mono ? 'font-mono text-[10.5px]' : ''}`}
        title={value}
      >
        {value || '—'}
      </dd>
    </div>
  );
}

function DetailsBody({ adb, app, metadata }: { adb: Adb; app: InstalledApp; metadata: AppMetadata | undefined }) {
  const t = useT();
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const output = await readPackageDetails(adb, app.packageName, { signal: controller.signal, timeout: 20000 });
        if (!controller.signal.aborted) setDetails(output.slice(0, DISPLAY_LIMIT));
      } catch (cause) {
        if (!controller.signal.aborted) setError(toErrorMessage(cause));
      } finally {
        if (controllerRef.current === controller) {
          setLoading(false);
          controllerRef.current = null;
        }
      }
    })();
    return () => controller.abort();
  }, [adb, app, attempt]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(details);
      toast.success(t('apps.details.copySuccess'));
    } catch {
      toast.error(t('apps.error.clipboardDenied'));
    }
  };

  return (
    <>
      <dl className="grid gap-x-6 sm:grid-cols-2">
        <Row label={t('apps.details.version')} value={metadata?.versionName || t('apps.details.unknown')} />
        <Row
          label={t('apps.details.versionCode')}
          value={String(metadata?.versionCode ?? app.versionCode ?? t('apps.details.unknown'))}
          mono
        />
        <Row label={t('apps.details.installer')} value={app.installer || t('apps.details.unknown')} mono />
        <Row
          label={t('apps.details.uid')}
          value={app.uid === undefined ? t('apps.details.unknown') : String(app.uid)}
          mono
        />
        <Row label={t('apps.details.apkPath')} value={app.sourceDir || t('apps.details.unknown')} mono />
      </dl>

      <section className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">dumpsys package</h3>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" disabled={!details} onClick={() => void copy()}>
              <Copy />
              {t('common.copy')}
            </Button>
            <Button size="sm" variant="ghost" disabled={loading} onClick={() => setAttempt(value => value + 1)}>
              {loading ? <Spinner className="size-3" /> : <RefreshCw />}
              {t('apps.details.reread')}
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="grid gap-1.5 rounded-[10px] border border-line-soft bg-surface-2 p-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-2.5" style={{ width: `${52 + ((index * 17) % 42)}%` }} />
            ))}
          </div>
        ) : error ? (
          <p className="rounded-[10px] border border-danger/30 bg-danger-soft px-3 py-2 text-[11.5px] text-danger">{error}</p>
        ) : (
          <pre className="max-h-[300px] overflow-auto rounded-[10px] bg-bay p-3 font-mono text-[10.5px] leading-relaxed text-bay-text">
            {details || t('apps.details.empty')}
          </pre>
        )}
      </section>
    </>
  );
}

export function AppDetailsDialog({ adb, app, metadata, onOpenChange }: AppDetailsDialogProps) {
  const t = useT();
  const label = metadata?.appName || app?.packageName || '';
  return (
    <Dialog open={app !== null} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(780px,94vw)]">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-10">
            {app ? (
              <AppIcon packageName={app.packageName} label={label} src={metadata?.icon} className="size-10 rounded-[11px]" />
            ) : null}
            <div className="min-w-0">
              <DialogTitle className="truncate">{label || t('apps.details.title')}</DialogTitle>
              <DialogDescription className="truncate font-mono text-[10.5px]">{app?.packageName}</DialogDescription>
            </div>
            {app ? (
              <Badge tone={isSystemApp(app) ? 'neutral' : 'accent'}>
                {isSystemApp(app) ? t('apps.badge.system') : t('apps.badge.user')}
              </Badge>
            ) : null}
          </div>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          {app && adb ? <DetailsBody key={app.packageName} adb={adb} app={app} metadata={metadata} /> : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
