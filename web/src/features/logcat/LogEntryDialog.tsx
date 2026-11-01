import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { logIdName, type AndroidLogPriority } from '@/lib/adb/logcat';
import { useT } from '@/lib/i18n';
import { formatLogLine, formatLogTime, priorityCharacter, priorityTone, type LogTone } from './logcatUtils';
import type { LogRecord } from './useLogcatStream';

const BADGE_TONE: Record<LogTone, 'neutral' | 'success' | 'warning' | 'danger'> = {
  muted: 'neutral',
  info: 'neutral',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

const LEVEL_NAMES: Record<number, string> = {
  0: 'Unknown',
  1: 'Default',
  2: 'Verbose',
  3: 'Debug',
  4: 'Info',
  5: 'Warn',
  6: 'Error',
  7: 'Fatal',
  8: 'Silent',
};

function levelLabel(priority: AndroidLogPriority): string {
  return LEVEL_NAMES[priority] ?? 'Unknown';
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line-soft py-1.5 last:border-0">
      <dt className="shrink-0 text-[11px] text-muted">{label}</dt>
      <dd className={`min-w-0 truncate text-right text-[11.5px] text-ink-soft ${mono ? 'font-mono text-[10.5px]' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

export interface LogEntryDialogProps {
  record: LogRecord | null;
  onOpenChange: (open: boolean) => void;
}

export function LogEntryDialog({ record, onOpenChange }: LogEntryDialogProps) {
  const t = useT();
  const entry = record?.entry;
  const copy = async () => {
    if (!entry) return;
    try {
      await navigator.clipboard.writeText(formatLogLine(entry));
      toast.success(t('logcat.toast.copied'));
    } catch {
      toast.error(t('logcat.toast.clipboardDenied'));
    }
  };

  return (
    <Dialog open={record !== null} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(720px,94vw)]">
        <DialogHeader>
          <div className="flex items-center gap-2 pr-10">
            {entry ? (
              <Badge tone={BADGE_TONE[priorityTone(entry.priority)]} className="font-mono">
                {priorityCharacter(entry.priority)} · {levelLabel(entry.priority)}
              </Badge>
            ) : null}
            <DialogTitle className="min-w-0 truncate">{entry?.tag ?? t('logcat.dialog.title')}</DialogTitle>
          </div>
          <DialogDescription className="font-mono text-[10.5px]">
            {entry ? formatLogTime(entry.timestamp) : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-3">
          {entry ? (
            <>
              <dl className="grid gap-x-6 sm:grid-cols-2">
                <Row label="PID" value={String(entry.pid)} mono />
                <Row label="TID" value={String(entry.tid)} mono />
                <Row label={t('logcat.dialog.tag')} value={entry.tag} mono />
                <Row label={t('logcat.dialog.buffer')} value={logIdName(entry.logId).toLowerCase()} mono />
              </dl>
              <pre className="max-h-[340px] whitespace-pre-wrap break-words rounded-[10px] bg-bay p-3 font-mono text-[11px] leading-relaxed text-bay-text">
                {entry.message}
              </pre>
            </>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="md" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
          <Button variant="primary" size="md" disabled={!entry} onClick={() => void copy()}>
            <Copy />
            {t('logcat.dialog.copyLine')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
