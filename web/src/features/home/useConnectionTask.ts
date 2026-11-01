import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';

const TIMEOUT_MS = 60000;

export interface ConnectionTask {
  busy: boolean;
  status: string;
  error: string;
  run: (message: string, task: (signal: AbortSignal) => Promise<void>) => Promise<void>;
  cancel: () => void;
  clearError: () => void;
}

export function useConnectionTask(): ConnectionTask {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const busyRef = useRef(false);
  const operation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    clearTimer();
    busyRef.current = false;
    controller.current = null;
    setBusy(false);
    setStatus('');
  }, [clearTimer]);

  const cancel = useCallback(() => {
    operation.current += 1;
    controller.current?.abort(new DOMException(t('home.task.cancelled'), 'AbortError'));
    finish();
  }, [finish, t]);

  const run = useCallback(
    async (message: string, task: (signal: AbortSignal) => Promise<void>): Promise<void> => {
      if (busyRef.current) return;
      const id = operation.current + 1;
      operation.current = id;
      busyRef.current = true;
      setBusy(true);
      setStatus(message);
      setError('');
      const abort = new AbortController();
      controller.current = abort;
      timer.current = window.setTimeout(() => {
        if (operation.current !== id) return;
        operation.current += 1;
        abort.abort();
        setError(t('home.task.timeout'));
        finish();
      }, TIMEOUT_MS);
      try {
        await task(abort.signal);
      } catch (cause) {
        if (operation.current === id) setError(toErrorMessage(cause));
      } finally {
        if (operation.current === id) finish();
      }
    },
    [finish, t],
  );

  useEffect(
    () => () => {
      operation.current += 1;
      controller.current?.abort();
      clearTimer();
    },
    [clearTimer],
  );

  return { busy, status, error, run, cancel, clearError: () => setError('') };
}
