import {
  Copy,
  Download,
  Info,
  MoreHorizontal,
  PencilLine,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { RemoteFile } from '@/lib/adb/files';
import { t } from '@/lib/i18n';

export interface FileRowMenuProps {
  entry: RemoteFile;
  disabled?: boolean;
  onDetails: () => void;
  onDownload: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCopyPath: () => void;
}

export function FileRowMenu(props: FileRowMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('files.row.more', { name: props.entry.name })}
          disabled={props.disabled}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[168px]">
        <DropdownMenuItem onSelect={props.onDetails}>
          <Info />
          {t('files.row.details')}
        </DropdownMenuItem>
        {props.entry.isDirectory ? null : (
          <DropdownMenuItem onSelect={props.onDownload}>
            <Download />
            {t('files.transfer.phase.download')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={props.onRename}>
          <PencilLine />
          {t('common.rename')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={props.onCopyPath}>
          <Copy />
          {t('files.details.copyPath')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger"
          onSelect={props.onDelete}
        >
          <Trash2 />
          {t('common.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
