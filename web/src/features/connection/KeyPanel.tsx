import { useRef } from 'react';
import { Copy, Download, KeyRound, Plus, RefreshCw, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { PanelShell } from '@/features/connection/PanelShell';
import { shortFingerprint, useAdbKeys } from '@/features/connection/useAdbKeys';
import { useT } from '@/lib/i18n';

export function KeyPanel() {
  const t = useT();
  const keys = useAdbKeys();
  const inputRef = useRef<HTMLInputElement>(null);
  const entries = keys.entries;
  const count = entries?.length ?? 0;

  return (
    <PanelShell
      kicker="ADB keys"
      title={t('connection.keys.title')}
      action={
        <div className="flex items-center gap-2">
          <Badge tone={count > 0 ? 'success' : 'neutral'}>
            {entries === null ? t('connection.keys.reading') : t('connection.keys.count', { count })}
          </Badge>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('connection.keys.refresh')}
            onClick={keys.refresh}
            disabled={keys.busy}
          >
            <RefreshCw />
          </Button>
        </div>
      }
    >
      <p className="text-[11px] leading-relaxed text-muted">{t('connection.keys.description')}</p>

      {keys.error ? <p className="text-[11px] leading-relaxed text-danger">{keys.error}</p> : null}

      {entries === null ? (
        <div className="flex items-center gap-2 rounded-[10px] border border-line-soft bg-surface-2 px-3 py-3 text-[11px] text-muted">
          <Spinner className="size-3.5" />
          {t('connection.keys.loadingKeys')}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-line-strong bg-surface-2 px-4 py-5 text-center">
          <KeyRound className="mx-auto size-5 text-muted-2" />
          <p className="mt-2 text-[12px] font-semibold text-ink-soft">{t('connection.keys.emptyTitle')}</p>
          <p className="mt-1 text-[11px] text-muted">{t('connection.keys.emptyHint')}</p>
        </div>
      ) : (
        <div className="divide-y divide-line-soft overflow-hidden rounded-[10px] border border-line-soft">
          {entries.map(entry => (
            <div key={entry.index} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0 leading-tight">
                <p className="text-[11.5px] font-semibold text-ink-soft">
                  {t('connection.keys.itemTitle', { index: entry.index + 1 })}
                </p>
                <p className="truncate font-mono text-[10.5px] text-muted" title={entry.fingerprint}>
                  SHA-256 {shortFingerprint(entry.fingerprint)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('connection.keys.copyPublic')}
                  title={t('connection.keys.copyPublic')}
                  onClick={() => keys.copyPublicKey(entry)}
                >
                  <Copy />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('connection.keys.exportPrivate')}
                  title={t('connection.keys.exportPrivateTitle')}
                  onClick={() => keys.exportKey(entry)}
                >
                  <Download />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <Button variant="primary" size="lg" disabled={keys.busy} onClick={keys.generate}>
          {keys.busy ? <Spinner className="size-3.5" /> : <Plus />}
          {t('connection.keys.generate')}
        </Button>
        <Button variant="outline" size="lg" disabled={keys.busy} onClick={() => inputRef.current?.click()}>
          <Upload />
          {t('connection.keys.import')}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pem,.key,.der,.txt"
          className="hidden"
          onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) keys.importFile(file);
          }}
        />
        <span className="text-[10.5px] text-muted">{t('connection.keys.importHint')}</span>
      </div>
    </PanelShell>
  );
}
