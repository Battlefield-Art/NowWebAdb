import { useCallback, useEffect, useRef, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { toast } from 'sonner';
import type { RemoteFile } from '@/lib/adb/files';
import { createDirectory, removePath, renamePath, statPath } from '@/lib/adb/files';
import { joinRemotePath, parentRemotePath, validateRemoteName } from '@/lib/adb/paths';
import { toErrorMessage } from '@/lib/utils/format';
import { downloadFiles, uploadFiles, type FileTransferProgress } from './fileTransfers';
import { t } from '@/lib/i18n';

export interface FileActionsOptions {
  adb: Adb | null;
  directory: string;
  refresh: () => void;
  removeLocal: (paths: readonly string[]) => void;
  navigate: (path: string) => void;
}

export function useFileActions({ adb, directory, refresh, removeLocal, navigate }: FileActionsOptions) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<FileTransferProgress | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const begin = useCallback(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    return controller;
  }, []);

  const finish = useCallback((controller: AbortController) => {
    if (controllerRef.current === controller) controllerRef.current = null;
    setBusy(false);
    setProgress(null);
  }, []);

  const cancel = useCallback(() => controllerRef.current?.abort(), []);

  const upload = useCallback(
    async (files: readonly File[]) => {
      if (!adb || !files.length || controllerRef.current) return;
      const controller = begin();
      try {
        const count = await uploadFiles(adb, directory, files, {
          signal: controller.signal,
          onProgress: setProgress,
        });
        toast.success(t('files.action.uploaded', { count: count }));
        refresh();
      } catch (cause) {
        if (!controller.signal.aborted) toast.error(toErrorMessage(cause));
      } finally {
        finish(controller);
      }
    },
    [adb, begin, directory, finish, refresh],
  );

  const download = useCallback(
    async (entries: readonly RemoteFile[]) => {
      if (!adb || !entries.length || controllerRef.current) return;
      const controller = begin();
      try {
        const result = await downloadFiles(adb, entries, {
          signal: controller.signal,
          onProgress: setProgress,
        });
        if (result) toast.success(t('files.action.saving', { filename: result.filename }));
      } catch (cause) {
        if (!controller.signal.aborted) toast.error(toErrorMessage(cause));
      } finally {
        finish(controller);
      }
    },
    [adb, begin, finish],
  );

  const remove = useCallback(
    async (entries: readonly RemoteFile[]) => {
      if (!adb || !entries.length || controllerRef.current) return;
      const controller = begin();
      try {
        for (const entry of entries) {
          if (controller.signal.aborted) break;
          await removePath(adb, entry.path, { recursive: entry.isDirectory, signal: controller.signal });
          removeLocal([entry.path]);
        }
        toast.success(t('files.action.deleted', { count: entries.length }));
      } catch (cause) {
        if (!controller.signal.aborted) toast.error(toErrorMessage(cause));
        refresh();
      } finally {
        finish(controller);
      }
    },
    [adb, begin, finish, refresh, removeLocal],
  );

  const rename = useCallback(
    async (entry: RemoteFile, name: string): Promise<boolean> => {
      if (!adb || controllerRef.current) return false;
      try {
        const next = validateRemoteName(name);
        const target = joinRemotePath(parentRemotePath(entry.path), next);
        await renamePath(adb, entry.path, target);
        toast.success(t('files.action.renamed', { name: next }));
        refresh();
        return true;
      } catch (cause) {
        toast.error(toErrorMessage(cause));
        return false;
      }
    },
    [adb, refresh],
  );

  const createFolder = useCallback(
    async (name: string): Promise<boolean> => {
      if (!adb || controllerRef.current) return false;
      try {
        const next = validateRemoteName(name);
        await createDirectory(adb, joinRemotePath(directory, next));
        toast.success(t('files.action.folderCreated', { name: next }));
        refresh();
        return true;
      } catch (cause) {
        toast.error(toErrorMessage(cause));
        return false;
      }
    },
    [adb, directory, refresh],
  );

  const openDirectory = useCallback(
    async (path: string): Promise<boolean> => {
      if (!adb) return false;
      try {
        const info = await statPath(adb, path);
        if (!info.isDirectory) throw new Error(t('files.error.notFolder'));
        navigate(info.path);
        return true;
      } catch (cause) {
        toast.error(toErrorMessage(cause));
        return false;
      }
    },
    [adb, navigate],
  );

  return { busy, progress, upload, download, remove, rename, createFolder, openDirectory, cancel };
}

export type FileActions = ReturnType<typeof useFileActions>;
