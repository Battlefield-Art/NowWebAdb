import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import type { RemoteFile } from '@/lib/adb/files';
import { selectAdb, useDeviceStore } from '@/stores/device';
import { FileDetailsDialog } from './FileDetailsDialog';
import { FilesTableCard } from './FilesTableCard';
import { filterFiles, sortFiles, type FileSortKey } from './fileUtils';
import { JumpPathDialog } from './JumpPathDialog';
import { NameDialog } from './NameDialog';
import { useFileActions } from './useFileActions';
import { useFileWatch } from './useFileWatch';
import { useFiles } from './useFiles';
import { t } from '@/lib/i18n';

type NameDialogState = { mode: 'create' } | { mode: 'rename'; file: RemoteFile } | null;

export default function FilesPage() {
  const adb = useDeviceStore(selectAdb);
  const files = useFiles(adb);
  const watch = useFileWatch(adb, {
    path: files.path,
    entries: files.entries,
    loading: files.loading,
    refresh: files.refresh,
  });
  const actions = useFileActions({
    adb,
    directory: files.path,
    refresh: files.refresh,
    removeLocal: files.removeLocal,
    navigate: files.navigate,
  });

  const [sortKey, setSortKey] = useState<FileSortKey>('name');
  const [ascending, setAscending] = useState(true);
  const [nameDialog, setNameDialog] = useState<NameDialogState>(null);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<RemoteFile | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<readonly RemoteFile[] | null>(null);

  const visibleFiles = useMemo(
    () => sortFiles(filterFiles(files.entries, files.query), sortKey, ascending),
    [files.entries, files.query, sortKey, ascending],
  );

  const handleSort = (key: FileSortKey) => {
    if (key === sortKey) {
      setAscending(value => !value);
      return;
    }
    setSortKey(key);
    setAscending(true);
  };

  const copyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      toast.success(t('files.page.pathCopied'));
    } catch {
      toast.error(t('apps.error.clipboardDenied'));
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-2">
            {t('files.page.eyebrow')}
          </p>
          <h1 className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-ink">{t('files.page.title')}</h1>
          <p className="mt-1 min-w-0 truncate font-mono text-[11.5px] text-muted" title={files.path}>
            {files.path}
            {` · ${
              files.loading
                ? t('files.page.loading')
                : t('files.page.itemCount', { count: visibleFiles.length })
            }`}
          </p>
        </div>
        <p className="text-[11px] text-muted">{t('files.page.hint')}</p>
      </div>

      <FilesTableCard
        files={files}
        actions={actions}
        visibleFiles={visibleFiles}
        sortKey={sortKey}
        ascending={ascending}
        onSort={handleSort}
        onOpen={file => files.navigate(file.path)}
        onDetails={setDetailsTarget}
        onRename={file => setNameDialog({ mode: 'rename', file })}
        onDelete={setDeleteTargets}
        onNewFolder={() => setNameDialog({ mode: 'create' })}
        onJump={() => setJumpOpen(true)}
        onCopyPath={path => void copyPath(path)}
        watching={watch.watching}
        onToggleWatch={watch.toggleWatch}
      />

      {nameDialog ? (
        <NameDialog
          key={nameDialog.mode === 'rename' ? nameDialog.file.path : 'create'}
          open
          onOpenChange={open => {
            if (!open) setNameDialog(null);
          }}
          title={nameDialog.mode === 'create' ? t('files.newFolder.title') : t('common.rename')}
          description={nameDialog.mode === 'create' ? t('files.newFolder.description', { path: files.path }) : nameDialog.file.path}
          label={nameDialog.mode === 'create' ? t('files.newFolder.label') : t('files.rename.label')}
          initialValue={nameDialog.mode === 'rename' ? nameDialog.file.name : ''}
          placeholder={nameDialog.mode === 'create' ? t('files.newFolder.placeholder') : undefined}
          confirmLabel={nameDialog.mode === 'create' ? t('files.newFolder.confirm') : t('common.rename')}
          onSubmit={name =>
            nameDialog.mode === 'create'
              ? actions.createFolder(name)
              : actions.rename(nameDialog.file, name)
          }
        />
      ) : null}

      {jumpOpen ? (
        <JumpPathDialog
          open
          onOpenChange={setJumpOpen}
          initialValue={files.path}
          onSubmit={actions.openDirectory}
        />
      ) : null}

      <FileDetailsDialog
        adb={adb}
        file={detailsTarget}
        onOpenChange={open => {
          if (!open) setDetailsTarget(null);
        }}
      />

      <ConfirmDialog
        open={deleteTargets !== null}
        onOpenChange={open => {
          if (!open) setDeleteTargets(null);
        }}
        title={t('files.delete.title', { count: deleteTargets?.length ?? 0 })}
        description={
          deleteTargets?.some(entry => entry.isDirectory)
            ? t('files.delete.descriptionFolder')
            : t('files.delete.descriptionFiles')
        }
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (deleteTargets) {
            const targets = deleteTargets;
            setDeleteTargets(null);
            void actions.remove(targets);
          }
        }}
      />
    </div>
  );
}
