import { useCallback, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import '@xterm/xterm/css/xterm.css';
import { useT, type MessageKey } from '@/lib/i18n';
import { selectAdb, useDeviceStore } from '@/stores/device';
import { TerminalContextMenu } from './TerminalContextMenu';
import { TerminalToolbar } from './TerminalToolbar';
import { useTerminal, type TerminalStatus } from './useTerminal';

const STATUS_HINT_KEYS: Record<TerminalStatus, MessageKey> = {
  idle: 'terminal.status.idleHint',
  connecting: 'terminal.status.connectingHint',
  running: 'terminal.status.runningHint',
  exited: 'terminal.status.exitedHint',
  error: 'terminal.status.errorHint',
};

export default function TerminalPage() {
  const t = useT();
  const adb = useDeviceStore(selectAdb);
  const serial = useDeviceStore(state => state.serial);
  const {
    containerRef,
    status,
    error,
    fontSize,
    restart,
    clear,
    setFontSize,
    selectAll,
    copySelection,
    paste: pasteFromClipboard,
  } = useTerminal(adb);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const closeMenu = useCallback(() => setMenu(null), []);

  const copy = useCallback(() => {
    void copySelection()
      .then(copied => {
        if (copied) toast.success(t('terminal.toast.copied'));
        else toast.info(t('terminal.toast.noSelection'));
      })
      .catch(() => toast.error(t('terminal.toast.clipboardDenied')));
  }, [copySelection, t]);

  const paste = useCallback(() => {
    pasteFromClipboard()
      .then(pasted => {
        if (!pasted) toast.info(t('terminal.toast.pasteUnavailable'));
      })
      .catch(() => toast.error(t('terminal.toast.clipboardDenied')));
  }, [pasteFromClipboard, t]);

  return (
    <div className="flex h-[calc(100dvh-132px)] flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-2">Shell</p>
          <h1 className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-ink">{t('terminal.title')}</h1>
          <p className="mt-1 text-[11.5px] text-muted">
            {t(STATUS_HINT_KEYS[status])}
            {serial ? ` · ${serial}` : ''}
          </p>
        </div>
        <p className="text-[11px] text-muted">{t('terminal.header.shortcuts')}</p>
      </div>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-[#23262d] bg-bay shadow-float">
        <TerminalToolbar
          status={status}
          error={error}
          fontSize={fontSize}
          onRestart={restart}
          onClear={clear}
          onCopy={copy}
          onPaste={paste}
          onSelectAll={selectAll}
          onFontSizeChange={setFontSize}
        />
        <div
          className="relative min-h-0 flex-1"
          onContextMenu={event => {
            event.preventDefault();
            setMenu({ x: event.clientX, y: event.clientY });
          }}
        >
          <div ref={containerRef} className="h-full w-full px-2 py-2" />
          {status === 'connecting' || status === 'idle' ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-bay/75">
              <div className="flex items-center gap-2 rounded-full border border-bay-line bg-bay-2 px-3 py-1.5 text-[11.5px] text-bay-text">
                <Spinner className="size-3.5" label={t('terminal.loading.connecting')} />
                {status === 'idle'
                  ? t('terminal.loading.preparing')
                  : t('terminal.loading.establishing')}
              </div>
            </div>
          ) : null}
          {status === 'error' ? (
            <div className="absolute inset-0 grid place-items-center bg-bay/85 px-6">
              <div className="grid justify-items-center gap-2 text-center">
                <p className="text-[12.5px] font-semibold text-[#ff7a6b]">{t('terminal.error.unreachable')}</p>
                <p className="max-w-[420px] text-[11px] leading-relaxed text-bay-muted">{error}</p>
                <Button variant="outline" size="md" onClick={restart}>
                  <RotateCcw />
                  {t('common.retry')}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <TerminalContextMenu
        open={menu !== null}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        onClose={closeMenu}
        onCopy={copy}
        onPaste={paste}
        onSelectAll={selectAll}
        onClear={clear}
        onRestart={restart}
      />
    </div>
  );
}
