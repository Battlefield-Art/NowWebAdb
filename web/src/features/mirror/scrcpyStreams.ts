import type { ReadableStream, WritableStream } from '@yume-chan/stream-extra';
import { t } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';

export function consumeStream<T>(
  stream: ReadableStream<T>,
  sink: WritableStream<T>,
  signal: AbortSignal,
  label: string,
  onFailure: (error: Error) => void,
  required = false,
): void {
  void (async () => {
    try {
      await stream.pipeTo(sink, { signal });
      if (required && !signal.aborted) onFailure(new Error(t('mirror.session.streamEnded', { label })));
    } catch (error) {
      if (!signal.aborted) {
        onFailure(new Error(t('mirror.session.streamFailed', { label, error: toErrorMessage(error) })));
      }
    }
  })();
}
