import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Adb } from '@yume-chan/adb';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import type { PtyProcess } from '@/lib/adb/shell';
import { usePtyConnection, type PtyWriter } from './usePtyConnection';

const FONT_KEY = 'nowwebadb.terminal.fontSize';
const DEFAULT_FONT_SIZE = 13;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 20;
const ENCODER = new TextEncoder();

const THEME = {
  background: '#101216',
  foreground: '#e9e6dd',
  cursor: '#ff6a3d',
  cursorAccent: '#101216',
  selectionBackground: 'rgba(255, 106, 61, 0.28)',
  black: '#101216',
  red: '#ff7a6b',
  green: '#5fd39a',
  yellow: '#f2c55c',
  blue: '#7fb3ff',
  magenta: '#d59bff',
  cyan: '#63d8d0',
  white: '#e9e6dd',
  brightBlack: '#6b6f78',
  brightRed: '#ff9a8f',
  brightGreen: '#87e6b6',
  brightYellow: '#ffd98a',
  brightBlue: '#a6c8ff',
  brightMagenta: '#e6bcff',
  brightCyan: '#8feae2',
  brightWhite: '#ffffff',
} as const;

export type TerminalStatus = 'idle' | 'connecting' | 'running' | 'exited' | 'error';

function initialFontSize(): number {
  const stored = Number(localStorage.getItem(FONT_KEY));
  return Number.isInteger(stored) && stored >= MIN_FONT_SIZE && stored <= MAX_FONT_SIZE
    ? stored
    : DEFAULT_FONT_SIZE;
}

export interface TerminalController {
  containerRef: RefObject<HTMLDivElement | null>;
  status: TerminalStatus;
  error: string;
  fontSize: number;
  restart: () => void;
  clear: () => void;
  setFontSize: (size: number) => void;
  focus: () => void;
  selectAll: () => void;
  copySelection: () => Promise<boolean>;
  paste: () => Promise<boolean>;
}

export function useTerminal(adb: Adb | null): TerminalController {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const ptyRef = useRef<PtyProcess | null>(null);
  const writerRef = useRef<PtyWriter | null>(null);
  const [status, setStatus] = useState<TerminalStatus>('idle');
  const [error, setError] = useState('');
  const [fontSize, setFontSizeState] = useState(initialFontSize);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const term = new Terminal({
      fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
      fontSize: initialFontSize(),
      theme: THEME,
      cursorBlink: true,
      scrollback: 5000,
      allowProposedApi: false,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);
    terminalRef.current = term;
    fitRef.current = fit;

    const fitNow = () => {
      try {
        fit.fit();
      } catch {
        /* container not measured yet */
      }
    };
    const frame = requestAnimationFrame(fitNow);

    const inputDisposable = term.onData(data => {
      const writer = writerRef.current;
      if (!writer) return;
      void writer.write(ENCODER.encode(data)).catch(() => undefined);
    });

    term.attachCustomKeyEventHandler(event => {
      if (!event.ctrlKey || !event.shiftKey) return true;
      if (event.code === 'KeyC') {
        const selection = term.getSelection();
        if (!selection) return true;
        void navigator.clipboard.writeText(selection).catch(() => undefined);
        return false;
      }
      if (event.code === 'KeyV') {
        void (async () => {
          try {
            const text = await navigator.clipboard.readText();
            if (text) term.paste(text);
          } catch {
            /* clipboard unavailable */
          }
        })();
        return false;
      }
      return true;
    });

    const observer = new ResizeObserver(() => {
      fitNow();
      const pty = ptyRef.current;
      if (pty) void pty.resize(term.rows, term.cols).catch(() => undefined);
    });
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      inputDisposable.dispose();
      writerRef.current = null;
      ptyRef.current = null;
      term.dispose();
      terminalRef.current = null;
      fitRef.current = null;
    };
  }, []);

  usePtyConnection({
    adb,
    attempt,
    terminalRef,
    fitRef,
    ptyRef,
    writerRef,
    setStatus,
    setError,
  });

  useEffect(() => {
    const term = terminalRef.current;
    if (!term) return;
    term.options.fontSize = fontSize;
    try {
      fitRef.current?.fit();
    } catch {
      /* container not measured yet */
    }
    const pty = ptyRef.current;
    if (pty) void pty.resize(term.rows, term.cols).catch(() => undefined);
  }, [fontSize]);

  const restart = useCallback(() => {
    setStatus('connecting');
    setAttempt(value => value + 1);
  }, []);

  const clear = useCallback(() => terminalRef.current?.clear(), []);
  const focus = useCallback(() => terminalRef.current?.focus(), []);
  const selectAll = useCallback(() => {
    terminalRef.current?.selectAll();
    terminalRef.current?.focus();
  }, []);

  const setFontSize = useCallback((size: number) => {
    const next = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Math.round(size)));
    localStorage.setItem(FONT_KEY, String(next));
    setFontSizeState(next);
  }, []);

  const copySelection = useCallback(async () => {
    const selection = terminalRef.current?.getSelection() ?? '';
    if (!selection) return false;
    await navigator.clipboard.writeText(selection);
    return true;
  }, []);

  const paste = useCallback(async () => {
    const term = terminalRef.current;
    if (!term || !writerRef.current) return false;
    const text = await navigator.clipboard.readText();
    if (text) term.paste(text);
    return true;
  }, []);

  return {
    containerRef,
    status,
    error,
    fontSize,
    restart,
    clear,
    setFontSize,
    focus,
    selectAll,
    copySelection,
    paste,
  };
}
