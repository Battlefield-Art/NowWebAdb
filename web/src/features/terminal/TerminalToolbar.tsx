import {
  ClipboardPaste,
  Copy,
  Eraser,
  Minus,
  Plus,
  RotateCcw,
  TextSelect,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useT, type MessageKey } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import type { TerminalStatus } from './useTerminal';

const STATUS_LABEL_KEY: Record<TerminalStatus, MessageKey> = {
  idle: 'terminal.status.idle',
  connecting: 'terminal.status.connecting',
  running: 'terminal.status.running',
  exited: 'terminal.status.exited',
  error: 'terminal.status.error',
};

const STATUS_TONE: Record<TerminalStatus, string> = {
  idle: 'text-bay-muted',
  connecting: 'text-[#f2c55c]',
  running: 'text-[#5fd39a]',
  exited: 'text-[#f2c55c]',
  error: 'text-[#ff7a6b]',
};

export interface TerminalToolbarProps {
  status: TerminalStatus;
  error: string;
  fontSize: number;
  onRestart: () => void;
  onClear: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onFontSizeChange: (size: number) => void;
}

export function TerminalToolbar(props: TerminalToolbarProps) {
  const t = useT();
  const busy = props.status === 'connecting';
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-bay-line bg-bay-2 px-2.5 py-1.5">
      <span className={cn('inline-flex items-center gap-1.5 px-1 text-[11px] font-semibold', STATUS_TONE[props.status])}>
        {busy ? (
          <Spinner className="size-3 text-[#f2c55c]" />
        ) : (
          <span className="relative flex size-1.5">
            {props.status === 'running' ? (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#5fd39a] opacity-50" />
            ) : null}
            <span className="relative inline-flex size-1.5 rounded-full bg-current" />
          </span>
        )}
        {t(STATUS_LABEL_KEY[props.status])}
      </span>
      {props.error ? (
        <span className="min-w-0 max-w-[280px] truncate text-[10.5px] text-[#ff7a6b]" title={props.error}>
          {props.error}
        </span>
      ) : null}

      <span className="mx-1 h-4 w-px bg-bay-line" aria-hidden />

      <Button
        variant="ghost"
        size="sm"
        className="text-bay-text hover:bg-bay-3 hover:text-white"
        disabled={busy}
        onClick={props.onRestart}
      >
        <RotateCcw />
        {t('terminal.action.restart')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-bay-text hover:bg-bay-3 hover:text-white"
        onClick={props.onClear}
      >
        <Eraser />
        {t('terminal.action.clear')}
      </Button>

      <span className="mx-1 h-4 w-px bg-bay-line" aria-hidden />

      <Button
        variant="ghost"
        size="icon-sm"
        className="text-bay-text hover:bg-bay-3 hover:text-white"
        aria-label={t('terminal.action.copy')}
        title={t('terminal.action.copyShortcut')}
        onClick={props.onCopy}
      >
        <Copy />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-bay-text hover:bg-bay-3 hover:text-white"
        aria-label={t('terminal.action.paste')}
        title={t('terminal.action.pasteShortcut')}
        onClick={props.onPaste}
      >
        <ClipboardPaste />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-bay-text hover:bg-bay-3 hover:text-white"
        aria-label={t('terminal.action.selectAll')}
        title={t('terminal.action.selectAll')}
        onClick={props.onSelectAll}
      >
        <TextSelect />
      </Button>

      <div className="ml-auto flex items-center gap-1">
        <span className="text-[10px] uppercase tracking-[0.12em] text-bay-muted">{t('terminal.action.fontSize')}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-bay-text hover:bg-bay-3 hover:text-white"
          aria-label={t('terminal.action.fontSizeDown')}
          disabled={props.fontSize <= 10}
          onClick={() => props.onFontSizeChange(props.fontSize - 1)}
        >
          <Minus />
        </Button>
        <span className="w-5 text-center font-mono text-[11px] text-bay-text">{props.fontSize}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-bay-text hover:bg-bay-3 hover:text-white"
          aria-label={t('terminal.action.fontSizeUp')}
          disabled={props.fontSize >= 20}
          onClick={() => props.onFontSizeChange(props.fontSize + 1)}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}
