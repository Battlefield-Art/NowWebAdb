import { useRef, useState } from 'react';
import { FileArchive, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import type { ProgressEvent } from '@/lib/adb/types';
import { useT } from '@/lib/i18n';
import { formatBytes } from '@/lib/utils/format';

export interface PendingFile {
  file: File;
  bundle: boolean;
}

export function InstallProgress({ progress, busy, percent }: { progress: ProgressEvent; busy: boolean; percent: number }) {
  return (
    <div className="grid gap-1.5">
      <Progress value={busy ? percent : 100} />
      <div className="flex items-center justify-between gap-3 text-[10.5px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          {busy ? <Spinner className="size-3" /> : null}
          {progress.phase}
        </span>
        <span className="truncate font-mono text-muted-2">
          {progress.total > 0
            ? `${formatBytes(progress.loaded)} / ${formatBytes(progress.total)}`
            : formatBytes(progress.loaded)}
        </span>
      </div>
    </div>
  );
}

export function FileDropzone({ busy, onFiles }: { busy: boolean; onFiles: (files: FileList | readonly File[]) => void }) {
  const t = useT();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div
      className={`grid place-items-center gap-1.5 rounded-[10px] border border-dashed px-4 py-6 text-center transition-colors ${
        dragging ? 'border-accent bg-accent-soft/60' : 'border-line-strong bg-surface-2'
      }`}
      onDragOver={event => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={event => {
        event.preventDefault();
        setDragging(false);
        onFiles(event.dataTransfer.files);
      }}
    >
      <Upload className="size-5 text-muted-2" />
      <p className="text-[12px] text-muted">{t('apps.install.dropHint')}</p>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
        {t('apps.install.chooseFiles')}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".apk,.apks,.xapk,application/vnd.android.package-archive,application/zip"
        multiple
        hidden
        onChange={event => {
          if (event.target.files) onFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}

export function PendingFileList({
  files,
  busy,
  totalSize,
  onRemove,
}: {
  files: PendingFile[];
  busy: boolean;
  totalSize: number;
  onRemove: (file: File) => void;
}) {
  const t = useT();
  return (
    <ul className="grid gap-1">
      {files.map(item => (
        <li
          key={`${item.file.name}:${item.file.size}`}
          className="flex items-center gap-2 rounded-md border border-line-soft bg-surface px-2 py-1.5"
        >
          <FileArchive className="size-3.5 text-accent" />
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-soft" title={item.file.name}>
            {item.file.name}
          </span>
          {item.bundle ? (
            <span className="rounded-full bg-accent-soft px-1.5 py-px text-[9.5px] font-semibold text-accent-ink">
              {t('apps.install.bundleBadge')}
            </span>
          ) : null}
          <span className="font-mono text-[10.5px] text-muted-2">{formatBytes(item.file.size)}</span>
          <button
            type="button"
            aria-label={t('apps.install.removeFile', { name: item.file.name })}
            className="grid size-4 place-items-center rounded text-muted-2 hover:bg-surface-3 hover:text-ink disabled:opacity-40"
            disabled={busy}
            onClick={() => onRemove(item.file)}
          >
            <X className="size-3" />
          </button>
        </li>
      ))}
      <li className="flex items-center justify-between px-1 pt-1 text-[10.5px] text-muted">
        <span>{t('apps.install.fileCount', { count: files.length })}</span>
        <span className="font-mono">{formatBytes(totalSize)}</span>
      </li>
    </ul>
  );
}
