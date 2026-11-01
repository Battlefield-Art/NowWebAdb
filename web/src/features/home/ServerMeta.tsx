import { Switch } from '@/components/ui/switch';
import { useT } from '@/lib/i18n';
import type { ServerInfo } from '@/lib/connection/server';

export interface ServerMetaProps {
  info: ServerInfo | null;
  infoError: string;
  trackError: string;
  autoTrack: boolean;
  loaded: boolean;
  onAutoTrackChange: (value: boolean) => void;
}

export function ServerMeta({ info, infoError, trackError, autoTrack, loaded, onAutoTrackChange }: ServerMetaProps) {
  const t = useT();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3">
        <span
          className="min-w-0 truncate font-mono text-[10.5px] text-muted-2"
          title={info ? info.features.join(', ') : undefined}
        >
          {info
            ? t('home.serverMeta.info', { version: info.version, count: info.features.length })
            : t('home.serverMeta.notLoaded')}
        </span>
        <label className="flex items-center gap-2 text-[11px] text-muted">
          <Switch checked={autoTrack} onCheckedChange={onAutoTrackChange} disabled={!loaded} />
          {t('home.serverMeta.autoTrack')}
        </label>
      </div>
      {infoError ? <p className="text-[10.5px] leading-relaxed text-warning">{infoError}</p> : null}
      {trackError ? <p className="text-[10.5px] leading-relaxed text-danger">{trackError}</p> : null}
    </>
  );
}
