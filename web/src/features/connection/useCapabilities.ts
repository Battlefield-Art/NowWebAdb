import { useCallback, useEffect, useRef, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { readAdbCapabilities, type AdbCapabilities } from '@/lib/adb/capabilities';
import { toErrorMessage } from '@/lib/utils/format';

export interface CapabilitiesController {
  data: AdbCapabilities | null;
  loading: boolean;
  error: string;
  refresh: () => void;
}

export function useCapabilities(adb: Adb | null): CapabilitiesController {
  const [data, setData] = useState<AdbCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!adb) return;
    const token = requestRef.current + 1;
    requestRef.current = token;
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const next = await readAdbCapabilities(adb, controller.signal);
        if (requestRef.current === token) setData(next);
      } catch (cause) {
        if (requestRef.current === token && !controller.signal.aborted) setError(toErrorMessage(cause));
      } finally {
        if (requestRef.current === token) setLoading(false);
      }
    })();
    return () => {
      requestRef.current += 1;
      controller.abort();
    };
  }, [adb, attempt]);

  const refresh = useCallback(() => setAttempt(value => value + 1), []);

  return { data, loading, error, refresh };
}
