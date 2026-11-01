import { Checkbox } from '@/components/ui/checkbox';
import { formatMode, formatOctal, type RemoteFile } from '@/lib/adb/files';
import { formatBytes } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { FileIcon } from './FileIcon';
import { FileRowMenu } from './FileRowMenu';
import { fileKind, formatFileTime } from './fileUtils';
import { t } from '@/lib/i18n';

export interface FileRowProps {
  entry: RemoteFile;
  checked: boolean;
  disabled?: boolean;
  onToggle: (checked: boolean) => void;
  onOpen: () => void;
  onDetails: () => void;
  onDownload: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCopyPath: () => void;
}

export function FileRow(props: FileRowProps) {
  const { entry } = props;
  const permission = entry.mode === undefined ? formatOctal(entry.permission) : formatMode(entry.mode);
  return (
    <tr
      className={cn(
        'group border-b border-line-soft transition-colors last:border-0 hover:bg-surface-2',
        props.checked && 'bg-accent-soft/40',
      )}
      onDoubleClick={() => (entry.isDirectory ? props.onOpen() : props.onDetails())}
    >
      <td className="w-8 pl-3 pr-0">
        <Checkbox
          aria-label={t('files.row.select', { name: entry.name })}
          checked={props.checked}
          disabled={props.disabled}
          onCheckedChange={value => props.onToggle(value === true)}
        />
      </td>
      <td className="min-w-0 py-1.5 pl-2 pr-3">
        <button
          type="button"
          className="flex w-full min-w-0 items-center gap-2 rounded text-left"
          title={entry.path}
          onClick={() => (entry.isDirectory ? props.onOpen() : props.onDetails())}
        >
          <FileIcon kind={fileKind(entry)} isLink={entry.isLink} />
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink-soft group-hover:text-ink">
            {entry.name}
          </span>
        </button>
      </td>
      <td className="hidden whitespace-nowrap py-1.5 pr-3 text-right font-mono text-[10.5px] text-muted sm:table-cell">
        {entry.isDirectory ? '—' : formatBytes(entry.size)}
      </td>
      <td className="hidden whitespace-nowrap py-1.5 pr-3 font-mono text-[10.5px] text-muted md:table-cell">
        {formatFileTime(entry.mtime)}
      </td>
      <td className="hidden whitespace-nowrap py-1.5 pr-3 font-mono text-[10.5px] text-muted-2 lg:table-cell">
        {permission}
      </td>
      <td className="w-9 pr-2 text-right">
        <FileRowMenu
          entry={entry}
          disabled={props.disabled}
          onDetails={props.onDetails}
          onDownload={props.onDownload}
          onRename={props.onRename}
          onDelete={props.onDelete}
          onCopyPath={props.onCopyPath}
        />
      </td>
    </tr>
  );
}
