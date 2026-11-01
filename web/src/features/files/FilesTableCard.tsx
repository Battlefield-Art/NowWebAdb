import { useState, type DragEvent } from 'react';
import { FileSearch, FolderOpen, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import type { RemoteFile } from '@/lib/adb/files';
import { formatBytes } from '@/lib/utils/format';
import type { FileActions } from './useFileActions';
import type { FilesController } from './useFiles';
import { FileSelectionBar } from './FileSelectionBar';
import { FileTable, FileTableSkeleton } from './FileTable';
import { FilesToolbar } from './FilesToolbar';
import type { FileSortKey } from './fileUtils';
import { t } from '@/lib/i18n';

export interface FilesTableCardProps {
  files: FilesController;
  actions: FileActions;
  visibleFiles: readonly RemoteFile[];
  sortKey: FileSortKey;
  ascending: boolean;
  onSort: (key: FileSortKey) => void;
  onOpen: (file: RemoteFile) => void;
  onDetails: (file: RemoteFile) => void;
  onRename: (file: RemoteFile) => void;
  onDelete: (entries: readonly RemoteFile[]) => void;
  onNewFolder: () => void;
  onJump: () => void;
  onCopyPath: (path: string) => void;
  watching: boolean;
  onToggleWatch: () => void;
}

export function FilesTableCard(props: FilesTableCardProps) {
  const { files, actions } = props;
  const [dragging, setDragging] = useState(false);
  const selectedEntries = files.entries.filter(entry => files.selected.has(entry.path));
  const progress = actions.progress;
  const percent = progress && progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (actions.busy || !event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    setDragging(true);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    if (actions.busy || !event.dataTransfer.files.length) return;
    void actions.upload(Array.from(event.dataTransfer.files));
  };

  return (
    <section
      className="relative overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_1px_0_rgba(22,24,28,0.03)]"
      onDragOver={handleDragOver}
      onDragLeave={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={handleDrop}
    >
      <FilesToolbar
        path={files.path}
        search={files.query}
        busy={actions.busy}
        refreshing={files.loading}
        onSearchChange={files.setQuery}
        onNavigate={files.navigate}
        onUp={files.goUp}
        onRefresh={files.refresh}
        onNewFolder={props.onNewFolder}
        onUploadFiles={listing => void actions.upload(listing)}
        onJump={props.onJump}
        onCopyPath={() => props.onCopyPath(files.path)}
        onRoot={() => files.navigate('/')}
        watching={props.watching}
        onToggleWatch={props.onToggleWatch}
      />

      {files.selected.size > 0 ? (
        <FileSelectionBar
          count={files.selected.size}
          busy={actions.busy}
          onDownload={() => void actions.download(selectedEntries)}
          onDelete={() => props.onDelete(selectedEntries)}
          onClear={files.clearSelection}
        />
      ) : null}

      {progress ? (
        <div className="border-b border-line-soft bg-accent-soft/50 px-3 py-2" role="status">
          <div className="flex items-center gap-2 text-[11px] text-accent-ink">
            <Spinner className="size-3" label={progress.phase} />
            <span className="truncate">
              {progress.phase} {progress.name} · {formatBytes(progress.loaded)}
              {progress.total > 0 ? ` / ${formatBytes(progress.total)}` : ''}
              {progress.count > 1 ? ` · ${progress.index + 1}/${progress.count}` : ''}
            </span>
            <button
              type="button"
              className="ml-auto shrink-0 rounded px-1.5 py-0.5 font-semibold hover:bg-accent-soft"
              onClick={actions.cancel}
            >
              {t('common.cancel')}
            </button>
          </div>
          <Progress className="mt-1.5" value={percent} />
        </div>
      ) : null}

      {files.loading ? (
        <FileTableSkeleton />
      ) : files.error ? (
        <EmptyState
          icon={<FolderOpen />}
          title={t('files.card.loadError')}
          description={files.error}
          action={
            <Button variant="primary" size="md" onClick={files.refresh}>
              {t('files.card.reload')}
            </Button>
          }
        />
      ) : props.visibleFiles.length === 0 ? (
        <EmptyState
          icon={files.query ? <FileSearch /> : <FolderOpen />}
          title={files.query ? t('files.card.noMatch') : t('files.card.empty')}
          description={files.query ? t('files.card.noMatchDescription') : t('files.card.emptyDescription')}
          action={
            files.query ? (
              <Button variant="outline" size="md" onClick={() => files.setQuery('')}>
                {t('apps.card.clearSearch')}
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                <Upload className="size-3.5" />
                {t('files.card.dragHint')}
              </span>
            )
          }
        />
      ) : (
        <>
          <FileTable
            files={props.visibleFiles}
            selected={files.selected}
            sortKey={props.sortKey}
            ascending={props.ascending}
            disabled={actions.busy}
            onSort={props.onSort}
            onToggle={files.toggle}
            onToggleAll={checked => files.toggleAll(props.visibleFiles.map(file => file.path), checked)}
            onOpen={props.onOpen}
            onDetails={props.onDetails}
            onDownload={entry => void actions.download([entry])}
            onRename={props.onRename}
            onDelete={entry => props.onDelete([entry])}
            onCopyPath={entry => props.onCopyPath(entry.path)}
          />
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft px-3 py-2 text-[10.5px] text-muted">
            <span className="tabular-nums">
              {t('files.card.footer', { visible: props.visibleFiles.length, total: files.entries.length })}
            </span>
            <span className="font-mono text-muted-2">ADB Sync · {files.path}</span>
          </footer>
        </>
      )}

      {dragging ? (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center border-2 border-dashed border-accent bg-accent-soft/80 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-1 text-accent-ink">
            <Upload className="size-6" />
            <span className="text-[12.5px] font-semibold">{t('files.card.dropHint', { path: files.path })}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
