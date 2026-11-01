import { useRef } from 'react';
import { Copy, FolderPlus, HardDrive, RefreshCw, Route, Search, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { FileBreadcrumb } from './FileBreadcrumb';
import { FILE_WATCH_INTERVAL } from './useFileWatch';
import { t } from '@/lib/i18n';

export interface FilesToolbarProps {
  path: string;
  search: string;
  busy: boolean;
  refreshing: boolean;
  watching: boolean;
  onSearchChange: (value: string) => void;
  onNavigate: (path: string) => void;
  onUp: () => void;
  onRefresh: () => void;
  onToggleWatch: () => void;
  onNewFolder: () => void;
  onUploadFiles: (files: readonly File[]) => void;
  onJump: () => void;
  onCopyPath: () => void;
  onRoot: () => void;
}

export function FilesToolbar(props: FilesToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = props.busy;

  return (
    <div className="grid gap-2 border-b border-line-soft px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <FileBreadcrumb path={props.path} disabled={busy} onNavigate={props.onNavigate} onUp={props.onUp} />
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={t('files.toolbar.refresh')}
          title={t('files.toolbar.refresh')}
          disabled={busy}
          onClick={props.onRefresh}
        >
          {props.refreshing ? <Spinner className="size-3" /> : <RefreshCw />}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="h-8 w-full min-w-[168px] flex-1 sm:max-w-[300px]"
          leading={<Search />}
          trailing={
            props.search ? (
              <button
                type="button"
                aria-label={t('apps.card.clearSearch')}
                className="grid size-5 place-items-center rounded text-muted-2 transition-colors hover:bg-surface-3 hover:text-ink"
                onClick={() => props.onSearchChange('')}
              >
                <X className="size-3" />
              </button>
            ) : null
          }
          value={props.search}
          placeholder={t('files.toolbar.searchPlaceholder')}
          aria-label={t('files.toolbar.search')}
          disabled={busy}
          onChange={event => props.onSearchChange(event.target.value)}
        />

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="md" disabled={busy}>
                {t('common.more')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[176px]">
              <DropdownMenuItem onSelect={props.onJump}>
                <Route />
                {t('files.toolbar.jump')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={props.onCopyPath}>
                <Copy />
                {t('files.toolbar.copyPath')}
              </DropdownMenuItem>
              <DropdownMenuCheckboxItem
                className="pl-8"
                checked={props.watching}
                title={t('files.toolbar.watchHint', { seconds: FILE_WATCH_INTERVAL / 1000 })}
                onCheckedChange={props.onToggleWatch}
              >
                {t('files.toolbar.watch')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={props.onRoot}>
                <HardDrive />
                {t('files.toolbar.root')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="md" disabled={busy} onClick={props.onNewFolder}>
            <FolderPlus />
            {t('files.newFolder.title')}
          </Button>
          <Button variant="primary" size="md" disabled={busy} onClick={() => inputRef.current?.click()}>
            {props.busy ? <Spinner className="size-3 text-white" /> : <Upload />}
            {t('files.toolbar.upload')}
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={event => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = '';
            if (files.length) props.onUploadFiles(files);
          }}
        />
      </div>
    </div>
  );
}
