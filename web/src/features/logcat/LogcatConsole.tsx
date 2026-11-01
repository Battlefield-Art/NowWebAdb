import { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ScrollText } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import {
  formatLogClock,
  priorityCharacter,
  priorityTone,
  type LogTone,
} from './logcatUtils';
import type { LogRecord } from './useLogcatStream';

const TONE_CLASS: Record<LogTone, string> = {
  muted: 'text-bay-muted',
  info: 'text-[#7fb3ff]',
  success: 'text-[#5fd39a]',
  warning: 'text-[#f2c55c]',
  danger: 'text-[#ff7a6b]',
};

const COLUMNS = 'grid-cols-[64px_18px_1fr] sm:grid-cols-[92px_22px_150px_1fr]';

export interface LogcatConsoleProps {
  records: readonly LogRecord[];
  hasRecords: boolean;
  streaming: boolean;
  onSelect: (record: LogRecord) => void;
}

export function LogcatConsole({ records, hasRecords, streaming, onSelect }: LogcatConsoleProps) {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [following, setFollowing] = useState(true);
  const virtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 22,
    overscan: 20,
  });

  useEffect(() => {
    if (!following || records.length === 0) return;
    virtualizer.scrollToIndex(records.length - 1, { align: 'end' });
  }, [following, records.length, virtualizer]);

  const jumpToLatest = () => {
    setFollowing(true);
    if (records.length > 0) virtualizer.scrollToIndex(records.length - 1, { align: 'end' });
  };

  const empty = records.length === 0;
  const title = hasRecords
    ? t('logcat.empty.filteredTitle')
    : streaming
      ? t('logcat.empty.waitingTitle')
      : t('logcat.empty.idleTitle');
  const description = hasRecords
    ? t('logcat.empty.filteredDescription')
    : streaming
      ? t('logcat.empty.waitingDescription')
      : t('logcat.empty.idleDescription');

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-bay">
      <div
        className={cn(
          'grid shrink-0 items-center gap-2 border-b border-bay-line px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-bay-muted',
          COLUMNS,
        )}
      >
        <span>{t('logcat.table.time')}</span>
        <span>{t('logcat.table.level')}</span>
        <span className="hidden sm:block">{t('logcat.table.tag')}</span>
        <span>{t('logcat.table.message')}</span>
      </div>

      {empty ? (
        <div className="grid min-h-0 flex-1 place-items-center px-6 py-10 text-center">
          <div className="grid justify-items-center gap-1.5">
            <ScrollText className="size-6 text-bay-muted" />
            <p className="text-[12.5px] font-semibold text-bay-text">{title}</p>
            <p className="max-w-[320px] text-[11px] leading-relaxed text-bay-muted">{description}</p>
          </div>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-auto"
          onScroll={event => {
            const element = event.currentTarget;
            const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
            setFollowing(distance < 24);
          }}
        >
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map(item => {
              const record = records[item.index];
              if (!record) return null;
              const { entry } = record;
              return (
                <div
                  key={record.id}
                  className="absolute left-0 top-0 w-full"
                  style={{ height: item.size, transform: `translateY(${item.start}px)` }}
                >
                  <button
                    type="button"
                    className={cn(
                      'grid h-full w-full items-center gap-2 px-3 text-left font-mono text-[10.5px] leading-none',
                      'hover:bg-bay-2 focus-visible:bg-bay-2 focus-visible:outline-none',
                      COLUMNS,
                    )}
                    title={`${priorityCharacter(entry.priority)}/${entry.tag}: ${entry.message}`}
                    onClick={() => onSelect(record)}
                  >
                    <span className="tabular-nums text-bay-muted">{formatLogClock(entry.timestamp)}</span>
                    <span className={cn('font-bold', TONE_CLASS[priorityTone(entry.priority)])}>
                      {priorityCharacter(entry.priority)}
                    </span>
                    <span className="hidden truncate text-[#89a7c7] sm:block">{entry.tag}</span>
                    <span className={cn('truncate', entry.priority >= 6 ? 'text-[#ffd9d3]' : 'text-bay-text')}>
                      {entry.message}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!following && records.length > 0 ? (
        <button
          type="button"
          className="pop-anim absolute bottom-3 right-4 z-10 inline-flex h-7 items-center gap-1.5 rounded-full border border-bay-line bg-bay-2 px-3 text-[11px] font-semibold text-bay-text shadow-float hover:bg-bay-3"
          onClick={jumpToLatest}
        >
          <ArrowDown className="size-3.5" />
          {t('logcat.jumpToLatest')}
        </button>
      ) : null}
    </div>
  );
}
