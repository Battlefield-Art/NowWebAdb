import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import type { RemoteFile } from '@/lib/adb/files';
import { cn } from '@/lib/utils/cn';
import { FileRow } from './FileRow';
import type { FileSortKey } from './fileUtils';
import { t } from '@/lib/i18n';

export interface FileTableProps {
  files: readonly RemoteFile[];
  selected: ReadonlySet<string>;
  sortKey: FileSortKey;
  ascending: boolean;
  disabled?: boolean;
  onSort: (key: FileSortKey) => void;
  onToggle: (path: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onOpen: (file: RemoteFile) => void;
  onDetails: (file: RemoteFile) => void;
  onDownload: (file: RemoteFile) => void;
  onRename: (file: RemoteFile) => void;
  onDelete: (file: RemoteFile) => void;
  onCopyPath: (file: RemoteFile) => void;
}

function SortHeader({
  label,
  target,
  sortKey,
  ascending,
  onSort,
  className,
}: {
  label: string;
  target: FileSortKey;
  sortKey: FileSortKey;
  ascending: boolean;
  onSort: (key: FileSortKey) => void;
  className?: string;
}) {
  const active = sortKey === target;
  const Icon = active ? (ascending ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className={cn('py-1.5 pr-3 text-left font-semibold', className)}>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded text-[10px] uppercase tracking-[0.08em] text-muted transition-colors hover:text-ink"
        onClick={() => onSort(target)}
      >
        {label}
        <Icon className={cn('size-3', active ? 'text-accent' : 'opacity-45')} />
      </button>
    </th>
  );
}

export function FileTable(props: FileTableProps) {
  const { files, selected } = props;
  const checkedCount = files.filter(file => selected.has(file.path)).length;
  const allChecked = files.length > 0 && checkedCount === files.length;
  const someChecked = checkedCount > 0 && !allChecked;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse">
        <thead>
          <tr className="border-b border-line bg-surface-2/60 text-[10px] uppercase tracking-[0.08em] text-muted">
            <th className="w-8 py-1.5 pl-3 pr-0">
              <Checkbox
                aria-label={t('files.table.selectAll')}
                checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                disabled={props.disabled || files.length === 0}
                onCheckedChange={value => props.onToggleAll(value === true)}
              />
            </th>
            <SortHeader
              label={t('files.table.name')}
              target="name"
              sortKey={props.sortKey}
              ascending={props.ascending}
              onSort={props.onSort}
              className="pl-2"
            />
            <SortHeader
              label={t('files.details.size')}
              target="size"
              sortKey={props.sortKey}
              ascending={props.ascending}
              onSort={props.onSort}
              className="hidden w-[92px] text-right sm:table-cell"
            />
            <SortHeader
              label={t('files.details.mtime')}
              target="mtime"
              sortKey={props.sortKey}
              ascending={props.ascending}
              onSort={props.onSort}
              className="hidden w-[136px] md:table-cell"
            />
            <th className="hidden w-[100px] py-1.5 pr-3 font-semibold lg:table-cell">{t('files.details.permission')}</th>
            <th className="w-9 py-1.5 pr-2" aria-label={t('apps.table.actions')} />
          </tr>
        </thead>
        <tbody>
          {files.map(file => (
            <FileRow
              key={file.path}
              entry={file}
              checked={selected.has(file.path)}
              disabled={props.disabled}
              onToggle={checked => props.onToggle(file.path, checked)}
              onOpen={() => props.onOpen(file)}
              onDetails={() => props.onDetails(file)}
              onDownload={() => props.onDownload(file)}
              onRename={() => props.onRename(file)}
              onDelete={() => props.onDelete(file)}
              onCopyPath={() => props.onCopyPath(file)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FileTableSkeleton() {
  return (
    <div className="px-3 py-2">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-line-soft py-2 last:border-0">
          <Skeleton className="size-3.5 rounded-[4px]" />
          <Skeleton className="size-6 rounded-[6px]" />
          <Skeleton className="h-3" style={{ width: `${20 + ((index * 13) % 34)}%` }} />
          <Skeleton className="ml-auto h-2.5 w-12" />
          <Skeleton className="hidden h-2.5 w-24 sm:block" />
        </div>
      ))}
    </div>
  );
}
