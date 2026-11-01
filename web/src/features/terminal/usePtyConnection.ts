import { useEffect, type RefObject } from 'react';
import type { Adb } from '@yume-chan/adb';
import type { MaybeConsumable } from '@yume-chan/stream-extra';
import type { FitAddon } from '@xterm/addon-fit';
import type { Terminal } from '@xterm/xterm';
import { openPty, type PtyProcess } from '@/lib/adb/shell';
import { t } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';
import type { TerminalStatus } from './useTerminal';

export type PtyWriter = WritableStreamDefaultWriter<MaybeConsumable<Uint8Array>>;

export interface PtySessionRefs {
  terminalRef: RefObject<Terminal | null>;
  fitRef: RefObject<FitAddon | null>;
  ptyRef: RefObject<PtyProcess | null>;
  writerRef: RefObject<PtyWriter | null>;
}

export interface PtySessionOptions extends PtySessionRefs {
  adb: Adb | null;
  attempt: number;
  setStatus: (status: TerminalStatus) => void;
  setError: (error: string) => void;
}

/** Opens a PTY session whenever `adb` or `attempt` changes and tears it down on cleanup. */
export function usePtyConnection(options: PtySessionOptions): void {
  const { adb, attempt, terminalRef, fitRef, ptyRef, writerRef, setStatus, setError } = options;

  useEffect(() => {
    if (!adb) return;
    let disposed = false;
    const term = terminalRef.current;
    const fit = fitRef.current;

    void (async () => {
      setStatus('connecting');
      setError('');
      try {
        term?.reset();
        const pty = await openPty(adb, { terminalType: 'xterm-256color' });
        if (disposed) {
          await pty.kill().catch(() => undefined);
          return;
        }
        ptyRef.current = pty;
        const writer = pty.input.getWriter();
        writerRef.current = writer;
        fit?.fit();
        await pty.resize(term?.rows ?? 24, term?.cols ?? 80).catch(() => undefined);
        if (disposed) return;
        setStatus('running');
        term?.focus();

        void (async () => {
          const reader = pty.output.getReader();
          try {
            for (;;) {
              const { value, done } = await reader.read();
              if (done) break;
              term?.write(value);
            }
          } catch {
            if (!disposed) {
              setStatus('error');
              setError(t('terminal.error.streamClosed'));
            }
          } finally {
            try {
              reader.releaseLock();
            } catch {
              /* already released */
            }
          }
        })();

        void pty.exited
          .then(code => {
            if (disposed) return;
            setStatus('exited');
            term?.write(`\r\n\x1b[38;5;244m${t('terminal.exited', { code })}\x1b[0m\r\n`);
          })
          .catch(() => undefined);
      } catch (cause) {
        if (!disposed) {
          setStatus('error');
          setError(toErrorMessage(cause));
        }
      }
    })();

    return () => {
      disposed = true;
      const writer = writerRef.current;
      writerRef.current = null;
      if (writer) void writer.close().catch(() => undefined);
      const pty = ptyRef.current;
      ptyRef.current = null;
      if (pty) void pty.kill().catch(() => undefined);
    };
  }, [adb, attempt, terminalRef, fitRef, ptyRef, writerRef, setStatus, setError]);
}
