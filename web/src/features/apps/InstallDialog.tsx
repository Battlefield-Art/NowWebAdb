import { useCallback, useEffect, useRef, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { InstallOptionFields } from '@/features/apps/InstallOptionFields';
import { FileDropzone, InstallProgress, PendingFileList, type PendingFile } from '@/features/apps/InstallFiles';
import { extractApkBundle, isBundleFile } from '@/lib/adb/apkBundle';
import {
  DEFAULT_APP_INSTALL_OPTIONS,
  installApks,
  parseInstallUser,
  type AppInstallOptions,
} from '@/lib/adb/packages';
import type { ProgressEvent } from '@/lib/adb/types';
import { listAndroidUsers, type AndroidUser } from '@/lib/adb/users';
import { useT } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';

function isApk(file: File): boolean {
  return /\.apk$/i.test(file.name) && file.size > 0;
}

function accepts(file: File): boolean {
  return isApk(file) || isBundleFile(file);
}

export interface InstallDialogProps {
  adb: Adb | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstalled: () => void;
}

export function InstallDialog({ adb, open, onOpenChange, onInstalled }: InstallDialogProps) {
  const t = useT();
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [users, setUsers] = useState<AndroidUser[]>([]);
  const [user, setUser] = useState('current');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [flags, setFlags] = useState<AppInstallOptions>(DEFAULT_APP_INSTALL_OPTIONS);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (!open || !adb) return;
    let cancelled = false;
    void listAndroidUsers(adb)
      .then(list => {
        if (!cancelled) setUsers(list);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, adb]);

  const addFiles = useCallback(
    (incoming: FileList | readonly File[]) => {
      const next = Array.from(incoming);
      const accepted = next.filter(accepts);
      setError(accepted.length === next.length ? '' : t('apps.install.ignoredFiles'));
      if (!accepted.length) return;
      setFiles(previous => {
        const seen = new Set(previous.map(item => `${item.file.name}:${item.file.size}`));
        const added = accepted
          .filter(file => !seen.has(`${file.name}:${file.size}`))
          .map(file => ({ file, bundle: isBundleFile(file) }));
        return [...previous, ...added];
      });
    },
    [t],
  );

  const close = (next: boolean) => {
    if (!next) {
      controllerRef.current?.abort();
      controllerRef.current = null;
      setFiles([]);
      setError('');
      setProgress(null);
      setBusy(false);
      setFlags(DEFAULT_APP_INSTALL_OPTIONS);
      setUser('current');
    }
    onOpenChange(next);
  };

  const install = async () => {
    if (!adb || !files.length || busy) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setError('');
    setProgress({ loaded: 0, total: 0, phase: t('apps.install.phase.preparing') });
    try {
      const apks: File[] = [];
      for (const item of files) {
        if (item.bundle) {
          apks.push(...(await extractApkBundle(item.file, { signal: controller.signal, onProgress: setProgress })));
        } else {
          apks.push(item.file);
        }
      }
      await installApks(adb, apks, {
        signal: controller.signal,
        onProgress: setProgress,
        installOptions: flags,
        user: parseInstallUser(user),
      });
      toast.success(t('apps.install.success', { count: apks.length }));
      setBusy(false);
      onInstalled();
      close(false);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(toErrorMessage(cause));
        setBusy(false);
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  };

  const totalSize = files.reduce((sum, item) => sum + item.file.size, 0);
  const percent = progress && progress.total > 0 ? Math.min(100, (progress.loaded / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="w-[min(520px,94vw)]">
        <DialogHeader>
          <DialogTitle>{t('apps.install.title')}</DialogTitle>
          <DialogDescription>{t('apps.install.description')}</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-3">
          <FileDropzone busy={busy} onFiles={addFiles} />

          {files.length ? (
            <PendingFileList
              files={files}
              busy={busy}
              totalSize={totalSize}
              onRemove={file => setFiles(previous => previous.filter(entry => entry.file !== file))}
            />
          ) : null}

          <InstallOptionFields
            flags={flags}
            users={users}
            user={user}
            disabled={busy}
            onFlagChange={(key, value) => setFlags(previous => ({ ...previous, [key]: value }))}
            onUserChange={setUser}
          />

          {progress ? <InstallProgress progress={progress} busy={busy} percent={percent} /> : null}

          {error ? <p className="text-[11.5px] leading-relaxed text-danger">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="md" onClick={() => close(false)}>
            {busy ? t('apps.install.cancel') : t('common.close')}
          </Button>
          <Button variant="primary" size="md" disabled={!files.length || busy || !adb} onClick={() => void install()}>
            {busy ? <Spinner className="size-3.5 text-white" label={t('apps.install.installing')} /> : null}
            {busy ? t('apps.install.installingEllipsis') : t('apps.install.start')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
