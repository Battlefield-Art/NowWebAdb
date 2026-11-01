import { useRef, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SimpleSelect } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { BackupPackagePicker } from '@/features/connection/BackupPackagePicker';
import { BackupRestoreSection } from '@/features/connection/BackupRestoreSection';
import { PanelShell } from '@/features/connection/PanelShell';
import { downloadDeviceBackup, type BackupScope } from '@/lib/adb/backup';
import { useT, type MessageKey } from '@/lib/i18n';
import { saveToDisk } from '@/lib/utils/download';
import { formatBytes, toErrorMessage } from '@/lib/utils/format';

type OptionKey = 'apk' | 'obb' | 'keyValue' | 'shared' | 'widgets' | 'compress';

const SCOPE_OPTIONS: ReadonlyArray<{ value: BackupScope; labelKey: MessageKey }> = [
  { value: 'user', labelKey: 'connection.backup.scopeUser' },
  { value: 'all', labelKey: 'connection.backup.scopeAll' },
  { value: 'packages', labelKey: 'connection.backup.scopePackages' },
];

const BACKUP_OPTIONS: ReadonlyArray<{ key: OptionKey; labelKey: MessageKey }> = [
  { key: 'apk', labelKey: 'connection.backup.optApk' },
  { key: 'obb', labelKey: 'connection.backup.optObb' },
  { key: 'keyValue', labelKey: 'connection.backup.optKeyValue' },
  { key: 'shared', labelKey: 'connection.backup.optShared' },
  { key: 'widgets', labelKey: 'connection.backup.optWidgets' },
  { key: 'compress', labelKey: 'connection.backup.optCompress' },
];

export interface DeviceBackupPanelProps {
  adb: Adb;
}

export function DeviceBackupPanel({ adb }: DeviceBackupPanelProps) {
  const t = useT();
  const [scope, setScope] = useState<BackupScope>('user');
  const [packages, setPackages] = useState<readonly string[]>([]);
  const [user, setUser] = useState('0');
  const [options, setOptions] = useState<Record<OptionKey, boolean>>({
    apk: true,
    obb: true,
    keyValue: true,
    shared: false,
    widgets: false,
    compress: true,
  });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const toggle = (key: OptionKey, checked: boolean): void => {
    setOptions(previous => ({ ...previous, [key]: checked }));
  };

  const missingPackages = scope === 'packages' && packages.length === 0;

  const start = async (): Promise<void> => {
    if (busy || missingPackages) return;
    setBusy(true);
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await downloadDeviceBackup(
        adb,
        {
          scope,
          packages,
          user: Number(user),
          saveSharedStorage: options.shared,
          saveWidgets: options.widgets,
          savePackageApk: options.apk,
          savePackageObb: options.obb,
          savePackageKeyValue: options.keyValue,
          compress: options.compress,
        },
        { signal: controller.signal, onProgress: setProgress },
      );
      saveToDisk(result.blob, result.filename);
      toast.success(t('connection.backup.done', { size: formatBytes(result.bytes) }));
    } catch (cause) {
      if (!controller.signal.aborted) toast.error(toErrorMessage(cause));
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <PanelShell
      kicker="Backup"
      title={t('connection.backup.title')}
      className="lg:col-span-2"
      action={<span className="text-[10.5px] text-muted-2">{t('connection.backup.limit', { size: formatBytes(1024 ** 3) })}</span>}
    >
      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <section className="grid content-start gap-2 rounded-[10px] border border-line-soft bg-surface-2 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">
            {t('connection.backup.createTitle')}
          </p>
          <div className="grid gap-1.5">
            <span className="text-[10.5px] font-semibold text-muted">{t('connection.backup.scopeLabel')}</span>
            <div className="grid grid-cols-[1fr_88px] gap-2">
              <SimpleSelect
                aria-label={t('connection.backup.scopeAria')}
                value={scope}
                options={SCOPE_OPTIONS.map(option => ({ value: option.value, label: t(option.labelKey) }))}
                disabled={busy}
                onValueChange={value => setScope(value as BackupScope)}
              />
              <Input
                value={user}
                className="h-8"
                inputMode="numeric"
                aria-label={t('connection.backup.userAria')}
                placeholder="0"
                disabled={busy}
                onChange={event => setUser(event.target.value.replace(/\D/g, '').slice(0, 3))}
              />
            </div>
            <p className="text-[10px] text-muted-2">{t('connection.backup.userHint')}</p>
          </div>
          {scope === 'packages' ? (
            <BackupPackagePicker
              adb={adb}
              selected={packages}
              disabled={busy}
              onChange={setPackages}
            />
          ) : null}
          <div className="grid grid-cols-2 gap-1.5">
            {BACKUP_OPTIONS.map(option => (
              <label key={option.key} className="flex items-center gap-2 text-[11px] text-ink-soft">
                <Checkbox
                  checked={options[option.key]}
                  disabled={busy}
                  onCheckedChange={value => toggle(option.key, value === true)}
                />
                {t(option.labelKey)}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="md" disabled={busy || missingPackages} onClick={() => void start()}>
              {busy ? <Spinner className="size-3.5" /> : <Download />}
              {busy ? t('connection.backup.starting') : t('connection.backup.start')}
            </Button>
            {busy ? (
              <Button variant="ghost" size="md" onClick={() => abortRef.current?.abort()}>
                <X />
                {t('common.cancel')}
              </Button>
            ) : null}
            {busy && progress > 0 ? (
              <span className="ml-auto font-mono text-[10.5px] text-muted">{formatBytes(progress)}</span>
            ) : null}
          </div>
          <p className="text-[10.5px] leading-relaxed text-muted">
            {missingPackages ? t('connection.backup.needPackages') : t('connection.backup.hint')}
          </p>
        </section>

        <BackupRestoreSection adb={adb} disabled={busy} />
      </div>
    </PanelShell>
  );
}
