import { Download, Eraser, Hash, Layers, MoreVertical, Play, Search, Square, Tag, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logIdName, type AndroidLogPriority, type LogId } from '@/lib/adb/logcat';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import { LOG_BUFFERS, LOG_LEVELS } from './logcatUtils';
import { LOG_BUFFER_LIMIT } from './useLogcatStream';

export interface LogcatToolbarProps {
  streaming: boolean;
  error: string;
  total: number;
  visible: number;
  minPriority: AndroidLogPriority;
  bufferIds: readonly LogId[];
  bufferAll: boolean;
  pid: string;
  tag: string;
  search: string;
  onPriorityChange: (priority: AndroidLogPriority) => void;
  onBufferToggle: (id: LogId, checked: boolean) => void;
  onBufferAllChange: (all: boolean) => void;
  onPidChange: (pid: string) => void;
  onTagChange: (tag: string) => void;
  onSearchChange: (search: string) => void;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
  onExport: () => void;
  onDeviceClear: () => void;
}

function StatusChip({ streaming, error }: { streaming: boolean; error: string }) {
  const t = useT();
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-[10.5px] font-semibold',
        streaming
          ? 'border-danger/25 bg-danger-soft text-danger'
          : error
            ? 'border-warning/30 bg-warning-soft text-warning'
            : 'border-line bg-surface-2 text-muted',
      )}
      title={error || undefined}
    >
      {streaming ? (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-danger" />
        </span>
      ) : (
        <span className="size-1.5 rounded-full bg-muted-2" />
      )}
      {streaming
        ? t('logcat.status.live')
        : error
          ? t('logcat.status.stopped')
          : t('logcat.status.idle')}
    </span>
  );
}

export function LogcatToolbar(props: LogcatToolbarProps) {
  const t = useT();
  return (
    <div className="grid gap-2 border-b border-line-soft px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={props.streaming ? 'outline' : 'primary'}
          size="md"
          onClick={props.streaming ? props.onStop : props.onStart}
        >
          {props.streaming ? <Square /> : <Play />}
          {props.streaming ? t('logcat.action.stop') : t('logcat.action.start')}
        </Button>
        <StatusChip streaming={props.streaming} error={props.error} />
        {props.error ? (
          <span className="min-w-0 max-w-[280px] truncate text-[10.5px] text-muted" title={props.error}>
            {props.error}
          </span>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <span className="hidden rounded-full border border-line bg-surface-2 px-2 py-1 font-mono text-[10px] text-muted sm:inline-flex">
            {props.total} / {LOG_BUFFER_LIMIT}
            {props.visible !== props.total ? t('logcat.badge.showing', { count: props.visible }) : ''}
          </span>
          <Button variant="ghost" size="md" disabled={props.total === 0} onClick={props.onClear}>
            <Eraser />
            {t('logcat.action.clearDisplay')}
          </Button>
          <Button variant="outline" size="md" disabled={props.visible === 0} onClick={props.onExport}>
            <Download />
            {t('logcat.action.export')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t('logcat.action.more')}>
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger"
                onSelect={props.onDeviceClear}
              >
                <Trash2 />
                {t('logcat.action.clearDevice')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-8 items-center rounded-control border border-line-strong bg-surface">
          <Select
            value={String(props.minPriority)}
            onValueChange={value => props.onPriorityChange(Number(value) as AndroidLogPriority)}
          >
            <SelectTrigger aria-label={t('logcat.level.aria')} className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOG_LEVELS.map(level => (
                <SelectItem key={level.value} value={String(level.value)}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <BufferMenu
          ids={props.bufferIds}
          all={props.bufferAll}
          onAllChange={props.onBufferAllChange}
          onToggle={props.onBufferToggle}
        />

        <Input
          className="h-8 w-[104px]"
          leading={<Hash />}
          inputMode="numeric"
          value={props.pid}
          placeholder={t('logcat.pid.placeholder')}
          aria-label={t('logcat.pid.aria')}
          title={t('logcat.capture.restartHint')}
          onChange={event => props.onPidChange(event.target.value)}
        />

        <Input
          className="h-8 w-[150px]"
          leading={<Tag />}
          value={props.tag}
          placeholder={t('logcat.tag.placeholder')}
          aria-label={t('logcat.tag.aria')}
          onChange={event => props.onTagChange(event.target.value)}
        />

        <Input
          className="h-8 min-w-[168px] flex-1 sm:max-w-[300px]"
          leading={<Search />}
          trailing={
            props.search ? (
              <button
                type="button"
                aria-label={t('logcat.search.clear')}
                className="grid size-5 place-items-center rounded text-muted-2 transition-colors hover:bg-surface-3 hover:text-ink"
                onClick={() => props.onSearchChange('')}
              >
                <X className="size-3" />
              </button>
            ) : null
          }
          value={props.search}
          placeholder={t('logcat.search.placeholder')}
          aria-label={t('logcat.search.aria')}
          onChange={event => props.onSearchChange(event.target.value)}
        />
      </div>
    </div>
  );
}

interface BufferMenuProps {
  ids: readonly LogId[];
  all: boolean;
  onAllChange: (all: boolean) => void;
  onToggle: (id: LogId, checked: boolean) => void;
}

function BufferMenu({ ids, all, onAllChange, onToggle }: BufferMenuProps) {
  const t = useT();
  const summary = all ? t('logcat.buffer.all') : ids.map(id => logIdName(id).toLowerCase()).join(' · ');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="md"
          aria-label={t('logcat.buffer.aria')}
          title={t('logcat.capture.restartHint')}
        >
          <Layers />
          <span className="max-w-[150px] truncate font-mono text-[11px]">{summary}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{t('logcat.buffer.title')}</DropdownMenuLabel>
        <DropdownMenuCheckboxItem checked={all} onCheckedChange={onAllChange}>
          {t('logcat.buffer.all')}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {LOG_BUFFERS.map(buffer => (
          <DropdownMenuCheckboxItem
            key={buffer.id}
            disabled={all}
            checked={all || ids.includes(buffer.id)}
            onCheckedChange={checked => onToggle(buffer.id, checked)}
          >
            <span className="font-mono text-[11px]">{logIdName(buffer.id).toLowerCase()}</span>
            <span className="text-muted">{t(buffer.labelKey)}</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
