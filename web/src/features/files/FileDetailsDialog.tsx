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
import { formatMode, formatOctal, statPath, type RemoteFile } from '@/lib/adb/files';
import { readFileHead } from '@/lib/adb/fileStream';
import { formatBytes, toErrorMessage } from '@/lib/utils/format';
import { FileIcon } from './FileIcon';
import { fileKind, fileTypeLabel, formatFileTime, isProbablyBinary, isTextLike } from './fileUtils';
import { t } from '@/lib/i18n';

const PREVIEW_LIMIT = 64 * 1024;

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

function DetailsBody({ adb, file }: { adb: Adb; file: RemoteFile }) {
  const [info, setInfo] = useState<RemoteFile | null>(null);
  const [preview, setPreview] = useState('');
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
      setPreview('');
      try {
        const detail = await statPath(adb, file.path, { signal: controller.signal, timeout: 15000 });
        if (controller.signal.aborted) return;
        setInfo(detail);
        if (!detail.isDirectory && isTextLike(file) && detail.size <= 4 * 1024 * 1024) {
          const bytes = await readFileHead(adb, file.path, PREVIEW_LIMIT, { signal: controller.signal });
          if (controller.signal.aborted) return;
          setPreview(isProbablyBinary(bytes) ? '' : new TextDecoder().decode(bytes));
        }
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
  }, [adb, file, attempt]);

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(info?.path ?? file.path);
      toast.success(t('files.page.pathCopied'));
    } catch {
      toast.error(t('apps.error.clipboardDenied'));
    }
  };

  if (loading) {
    return (
      <div className="grid gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-3" style={{ width: `${48 + ((index * 19) % 44)}%` }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-2">
        <p className="rounded-[10px] border border-danger/30 bg-danger-soft px-3 py-2 text-[11.5px] text-danger">{error}</p>
        <Button size="sm" variant="outline" onClick={() => setAttempt(value => value + 1)}>
          <RefreshCw />
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  const detail = info ?? file;
  const permission = detail.mode === undefined ? formatOctal(detail.permission) : formatMode(detail.mode);
  const previewTruncated = detail.size > PREVIEW_LIMIT;

  return (
    <>
      <dl className="grid gap-x-6 sm:grid-cols-2">
        <Row label={t('files.details.name')} value={detail.name} />
        <Row label={t('apps.table.type')} value={fileTypeLabel(detail)} />
        <Row label={t('files.details.size')} value={detail.isDirectory ? '—' : formatBytes(detail.size)} />
        <Row label={t('files.details.permission')} value={`${permission} · ${formatOctal(detail.permission)}`} mono />
        <Row label={t('files.details.owner')} value={detail.uid === undefined ? t('apps.details.unknown') : `${detail.uid}:${detail.gid ?? '—'}`} mono />
        <Row label={t('files.details.mtime')} value={formatFileTime(detail.mtime)} mono />
        <Row label={t('files.details.atime')} value={formatFileTime(detail.atime)} mono />
        <Row label={t('files.details.ctime')} value={formatFileTime(detail.ctime)} mono />
        <Row label={t('files.details.links')} value={detail.nlink === undefined ? t('apps.details.unknown') : String(detail.nlink)} mono />
        <Row label={t('files.details.symlink')} value={detail.isLink ? t('common.yes') : t('common.no')} />
      </dl>

      <div className="flex items-center justify-between gap-2 rounded-[10px] border border-line-soft bg-surface-2 px-3 py-2">
        <span className="min-w-0 truncate font-mono text-[10.5px] text-muted" title={detail.path}>
          {detail.path}
        </span>
        <Button size="sm" variant="ghost" onClick={() => void copyPath()}>
          <Copy />
          {t('files.details.copyPath')}
        </Button>
      </div>

      {preview ? (
        <section className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{t('files.details.preview')}</h3>
            {previewTruncated ? <span className="text-[10.5px] text-muted-2">{t('files.details.previewTruncated')}</span> : null}
          </div>
          <pre className="max-h-[260px] overflow-auto rounded-[10px] bg-bay p-3 font-mono text-[10.5px] leading-relaxed text-bay-text">
            {preview}
          </pre>
        </section>
      ) : null}
    </>
  );
}

export interface FileDetailsDialogProps {
  adb: Adb | null;
  file: RemoteFile | null;
  onOpenChange: (open: boolean) => void;
}

export function FileDetailsDialog({ adb, file, onOpenChange }: FileDetailsDialogProps) {
  return (
    <Dialog open={file !== null} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(720px,94vw)]">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-10">
            {file ? <FileIcon kind={fileKind(file)} isLink={file.isLink} className="size-8 rounded-[9px]" /> : null}
            <div className="min-w-0">
              <DialogTitle className="truncate">{file?.name ?? t('files.details.title')}</DialogTitle>
              <DialogDescription className="truncate font-mono text-[10.5px]">{file?.path}</DialogDescription>
            </div>
            {file ? <Badge tone={file.isDirectory ? 'warning' : 'neutral'}>{file.isDirectory ? t('files.type.folder') : t('files.type.file')}</Badge> : null}
          </div>
        </DialogHeader>
        <DialogBody className="grid gap-3">
          {adb && file ? <DetailsBody key={file.path} adb={adb} file={file} /> : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
