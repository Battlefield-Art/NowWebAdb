import { Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

export interface FileSelectionBarProps {
  count: number;
  busy: boolean;
  onDownload: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function FileSelectionBar({ count, busy, onDownload, onDelete, onClear }: FileSelectionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line-soft bg-surface-2 px-3 py-2">
      <span className="text-[11.5px] font-semibold text-ink-soft">
        {t('files.selection.count', { count })}
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        <Button size="sm" variant="outline" disabled={busy} onClick={onDownload}>
          <Download />
          {t('files.selection.download')}
        </Button>
        <Button size="sm" variant="danger-ghost" disabled={busy} onClick={onDelete}>
          <Trash2 />
          {t('files.selection.delete')}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onClear}>
          {t('common.clear')}
        </Button>
      </div>
    </div>
  );
}
