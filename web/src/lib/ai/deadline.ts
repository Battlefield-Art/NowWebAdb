import { AiError } from './types';
import { t } from '@/lib/i18n';

export interface DeadlineOptions {
  signal?: AbortSignal | undefined;
  timeoutMs: number;
  timeoutMessage: string;
}

/** Races a task against a timeout even if the task ignores the abort signal. */
export async function withDeadline<T>(
  task: (signal: AbortSignal) => Promise<T>,
  { signal, timeoutMs, timeoutMessage }: DeadlineOptions,
): Promise<T> {
  if (signal?.aborted) throw new AiError('aborted', t('assistant.client.error.aborted'));
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 120000) {
    throw new AiError('timeout-setting', t('assistant.deadline.timeoutSettingInvalid'));
  }

  const controller = new AbortController();
  let reason: AiError | undefined;
  let rejectCancellation: ((error: AiError) => void) | undefined;
  const cancellation = new Promise<never>((_, reject) => {
    rejectCancellation = reject;
  });
  const cancel = (error: AiError) => {
    if (controller.signal.aborted) return;
    reason = error;
    controller.abort();
    rejectCancellation?.(error);
  };
  const onAbort = () => cancel(new AiError('aborted', t('assistant.client.error.aborted')));
  signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(
    () => cancel(new AiError('timeout', timeoutMessage)),
    timeoutMs,
  );

  try {
    return await Promise.race([
      Promise.resolve().then(() => {
        if (controller.signal.aborted) throw reason ?? new AiError('aborted', t('assistant.deadline.stopped'));
        return task(controller.signal);
      }),
      cancellation,
    ]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
    controller.abort();
  }
}
