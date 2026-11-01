import { useCallback, useEffect, useRef, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import type { AndroidLogEntry, LogId } from '@/lib/adb/logcat';
import { consumeLogcat } from '@/lib/adb/logcat';
import { t } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';

export const LOG_BUFFER_LIMIT = 5000;
const FLUSH_INTERVAL = 120;

export interface LogRecord {
  id: number;
  entry: AndroidLogEntry;
}

/** Capture-side options; changing them restarts a running stream on the device. */
export interface LogcatCapture {
  ids: readonly LogId[];
  pid: number | undefined;
}

export interface LogcatStream {
  records: LogRecord[];
  streaming: boolean;
  error: string;
  start: () => void;
  stop: () => void;
  clear: () => void;
}

export function useLogcatStream(adb: Adb | null, capture: LogcatCapture): LogcatStream {
  const [records, setRecords] = useState<LogRecord[]>([]);
  const [wantStream, setWantStream] = useState(false);
  const [error, setError] = useState('');
  const bufferRef = useRef<LogRecord[]>([]);
  const idRef = useRef(0);

  const flush = useCallback(() => {
    const batch = bufferRef.current;
    if (!batch.length) return;
    bufferRef.current = [];
    setRecords(previous => {
      const next = previous.concat(batch);
      return next.length > LOG_BUFFER_LIMIT ? next.slice(next.length - LOG_BUFFER_LIMIT) : next;
    });
  }, []);

  const idsKey = capture.ids.join(',');
  const { pid } = capture;
  const captureRef = useRef(capture);
  useEffect(() => {
    captureRef.current = capture;
  }, [capture]);

  useEffect(() => {
    if (!adb || !wantStream) return;
    const controller = new AbortController();
    const timer = window.setInterval(flush, FLUSH_INTERVAL);
    void (async () => {
      const fail = (message: string) => {
        setError(message);
        setWantStream(false);
      };
      try {
        await consumeLogcat(adb, { ...captureRef.current, signal: controller.signal }, entry => {
          bufferRef.current.push({ id: idRef.current++, entry });
        });
        if (!controller.signal.aborted) fail(t('logcat.error.streamEnded'));
      } catch (cause) {
        if (!controller.signal.aborted) fail(toErrorMessage(cause));
      }
    })();
    return () => {
      controller.abort();
      window.clearInterval(timer);
      flush();
    };
    // The ref holds the newest capture options; idsKey/pid are the values that must
    // restart the stream, so the effect re-runs exactly when capture settings change.
  }, [adb, wantStream, idsKey, pid, flush]);

  const start = useCallback(() => {
    setError('');
    setWantStream(true);
  }, []);
  const stop = useCallback(() => setWantStream(false), []);

  const clear = useCallback(() => {
    bufferRef.current = [];
    setRecords([]);
  }, []);

  return { records, streaming: wantStream && adb !== null, error, start, stop, clear };
}
