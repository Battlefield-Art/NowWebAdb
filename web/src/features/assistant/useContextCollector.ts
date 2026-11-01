import { useCallback, useEffect, useRef, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { collectBasicDeviceContext } from '@/lib/ai/context';
import { describeAiError } from '@/lib/ai/errors';
import { t } from '@/lib/i18n';

export interface ContextCollector {
  draft: string;
  include: boolean;
  collecting: boolean;
  error: string;
  status: string;
  setDraft: (value: string) => void;
  setInclude: (value: boolean) => void;
  collect: () => Promise<void>;
  reset: () => void;
}

/** Reads only the four fixed read-only commands, and only after an explicit click. */
export function useContextCollector(adb: Adb | null, locked: boolean): ContextCollector {
  const [draft, setDraft] = useState('');
  const [include, setInclude] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const controllerRef = useRef<AbortController | null>(null);

  const collect = useCallback(async () => {
    if (locked || collecting) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setCollecting(true);
    setError('');
    setStatus('');
    try {
      const context = await collectBasicDeviceContext(adb, { signal: controller.signal });
      if (controllerRef.current !== controller) return;
      setDraft(context);
      // Collection does not opt the user into sending the data.
      setInclude(false);
      setStatus(t('assistant.context.status.updated'));
    } catch (cause) {
      if (controllerRef.current === controller) {
        setError(describeAiError(cause, t('assistant.context.error.collectFailed')));
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setCollecting(false);
      }
    }
  }, [adb, collecting, locked]);

  const reset = useCallback(() => {
    const controller = controllerRef.current;
    controllerRef.current = null;
    controller?.abort();
    setCollecting(false);
    setDraft('');
    setInclude(false);
    setError('');
    setStatus('');
  }, []);

  useEffect(
    () => () => {
      const controller = controllerRef.current;
      controllerRef.current = null;
      controller?.abort();
    },
    [],
  );

  return {
    draft,
    include,
    collecting,
    error,
    status,
    setDraft,
    setInclude,
    collect,
    reset,
  };
}
