import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { AndroidLogPriority, clearLogs, type LogId } from '@/lib/adb/logcat';
import { useT } from '@/lib/i18n';
import { saveToDisk, timestampForFilename } from '@/lib/utils/download';
import { toErrorMessage } from '@/lib/utils/format';
import { selectAdb, useDeviceStore } from '@/stores/device';
import {
  DEFAULT_LOG_BUFFERS,
  buffersToIds,
  formatExportHeader,
  formatLogText,
  matchesFilters,
  parseCapturePid,
  type LogFilters,
} from './logcatUtils';
import { LogcatConsole } from './LogcatConsole';
import { LogcatToolbar } from './LogcatToolbar';
import { LogEntryDialog } from './LogEntryDialog';
import { LOG_BUFFER_LIMIT, useLogcatStream, type LogRecord } from './useLogcatStream';

export default function LogcatPage() {
  const t = useT();
  const adb = useDeviceStore(selectAdb);
  const [filters, setFilters] = useState<LogFilters>({
    minPriority: AndroidLogPriority.Verbose,
    tag: '',
    search: '',
  });
  const [buffers, setBuffers] = useState<readonly LogId[]>(DEFAULT_LOG_BUFFERS);
  const [bufferAll, setBufferAll] = useState(false);
  const [pid, setPid] = useState('');
  const ids = useMemo(() => buffersToIds(buffers, bufferAll), [buffers, bufferAll]);
  const capture = useMemo(() => ({ ids, pid: parseCapturePid(pid) }), [ids, pid]);
  const stream = useLogcatStream(adb, capture);
  const [selected, setSelected] = useState<LogRecord | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearingDevice, setClearingDevice] = useState(false);

  const filtered = useMemo(
    () => stream.records.filter(record => matchesFilters(record.entry, filters)),
    [stream.records, filters],
  );

  const exportLogs = () => {
    if (!filtered.length) return;
    const header = formatExportHeader({
      minPriority: filters.minPriority,
      tag: filters.tag,
      search: filters.search,
      count: filtered.length,
      buffers: capture.ids,
      pid: capture.pid,
    });
    const blob = new Blob([header + formatLogText(filtered.map(record => record.entry))], {
      type: 'text/plain;charset=utf-8',
    });
    saveToDisk(blob, `nowwebadb-logcat-${timestampForFilename()}.txt`);
    toast.success(t('logcat.toast.exported', { count: filtered.length }));
  };

  const toggleBuffer = (id: LogId, checked: boolean) => {
    setBuffers(current => {
      if (checked) return current.includes(id) ? current : [...current, id];
      return current.filter(bufferId => bufferId !== id);
    });
  };

  const clearDeviceLogs = async () => {
    if (!adb || clearingDevice) return;
    setClearingDevice(true);
    try {
      await clearLogs(adb, ids);
      stream.clear();
      toast.success(t('logcat.toast.deviceCleared'));
    } catch (cause) {
      toast.error(toErrorMessage(cause));
    } finally {
      setClearingDevice(false);
    }
  };

  const subtitle = stream.streaming
    ? `${t('logcat.subtitle.streaming', { count: stream.records.length })}${
        filtered.length !== stream.records.length
          ? t('logcat.subtitle.matched', { count: filtered.length })
          : ''
      }`
    : stream.error
      ? t('logcat.subtitle.stopped', { error: stream.error })
      : t('logcat.subtitle.idle', { count: stream.records.length });

  return (
    <div className="flex h-[calc(100dvh-132px)] flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-2">Logcat</p>
          <h1 className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-ink">{t('logcat.title')}</h1>
          <p className="mt-1 max-w-[720px] truncate text-[11.5px] text-muted" title={subtitle}>
            {subtitle}
          </p>
        </div>
        <p className="text-[11px] text-muted">{t('logcat.hint', { limit: LOG_BUFFER_LIMIT })}</p>
      </div>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_1px_0_rgba(22,24,28,0.03)]">
        <LogcatToolbar
          streaming={stream.streaming}
          error={stream.error}
          total={stream.records.length}
          visible={filtered.length}
          minPriority={filters.minPriority}
          bufferIds={ids}
          bufferAll={bufferAll}
          pid={pid}
          tag={filters.tag}
          search={filters.search}
          onPriorityChange={minPriority => setFilters(current => ({ ...current, minPriority }))}
          onBufferToggle={toggleBuffer}
          onBufferAllChange={setBufferAll}
          onPidChange={setPid}
          onTagChange={tag => setFilters(current => ({ ...current, tag }))}
          onSearchChange={search => setFilters(current => ({ ...current, search }))}
          onStart={stream.start}
          onStop={stream.stop}
          onClear={stream.clear}
          onExport={exportLogs}
          onDeviceClear={() => setConfirmingClear(true)}
        />
        <LogcatConsole
          records={filtered}
          hasRecords={stream.records.length > 0}
          streaming={stream.streaming}
          onSelect={setSelected}
        />
      </section>

      <LogEntryDialog
        record={selected}
        onOpenChange={open => {
          if (!open) setSelected(null);
        }}
      />

      <ConfirmDialog
        open={confirmingClear}
        onOpenChange={setConfirmingClear}
        title={t('logcat.confirm.clearTitle')}
        description={t('logcat.confirm.clearDescription')}
        confirmLabel={t('logcat.confirm.clearConfirm')}
        onConfirm={() => {
          setConfirmingClear(false);
          void clearDeviceLogs();
        }}
      />
    </div>
  );
}
