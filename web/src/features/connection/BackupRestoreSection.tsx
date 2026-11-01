import { useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { restoreDeviceBackup } from '@/lib/adb/backup';
import { useT } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';

export interface BackupRestoreSectionProps {
  adb: Adb;
  disabled: boolean;
}

export function BackupRestoreSection({ adb, disabled }: BackupRestoreSectionProps) {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [user, setUser] = useState('0');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const restore = async (): Promise<void> => {
    if (!file) return;
    setConfirming(false);
    setBusy(true);
    try {
      await restoreDeviceBackup(adb, { user: Number(user), file });
      toast.success(t('connection.restore.started'));
      setFile(null);
    } catch (cause) {
      toast.error(toErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid content-start gap-2 rounded-[10px] border border-line-soft bg-surface-2 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">
        {t('connection.restore.title')}
      </p>
      <p className="text-[10.5px] leading-relaxed text-muted">
        {t('connection.restore.description')}
      </p>
      <div className="flex items-center gap-2">
        <input
          id="restore-backup-file"
          type="file"
          accept=".ab,application/octet-stream"
          className="sr-only"
          onChange={event => setFile(event.target.files?.[0] ?? null)}
        />
        <label
          htmlFor="restore-backup-file"
          className="inline-flex h-7 shrink-0 cursor-pointer items-center rounded-[7px] border border-line-strong bg-surface px-2 text-[12px] font-semibold text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          {t('connection.restore.chooseFile')}
        </label>
        <span className="min-w-0 truncate text-[10.5px] text-muted">{file?.name ?? t('connection.restore.noFile')}</span>
      </div>
      <Field
        label={t('connection.restore.userLabel')}
        htmlFor="restore-user"
        hint={t('connection.restore.userHint')}
      >
        <Input
          id="restore-user"
          value={user}
          className="h-7 w-24"
          inputMode="numeric"
          aria-label={t('connection.restore.userAria')}
          onChange={event => setUser(event.target.value.replace(/\D/g, '').slice(0, 3))}
        />
      </Field>
      <Button
        variant="danger"
        size="md"
        disabled={!file || busy || disabled}
        onClick={() => setConfirming(true)}
      >
        {busy ? <Spinner className="size-3.5" /> : <Upload />}
        {t('connection.restore.restore')}
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('connection.restore.confirmTitle')}
        description={t('connection.restore.confirmDescription', {
          file: file?.name ?? t('connection.restore.selectedFile'),
          user: user || '0',
        })}
        confirmLabel={t('connection.restore.confirm')}
        onConfirm={() => void restore()}
      />
    </section>
  );
}
