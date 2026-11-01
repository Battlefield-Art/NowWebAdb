import type { ReadableStream } from '@yume-chan/stream-extra';
import { t } from '@/lib/i18n';

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException(t('files.error.cancelled'), 'AbortError');
  }
}

export function withTimeout<T>(value: PromiseLike<T>, timeout: number, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (callback: (input: T) => void, input: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      callback(input);
    };
    const abort = () => finish(reject, (signal?.reason ?? new Error(t('files.error.cancelled'))) as T);
    const timer = setTimeout(() => finish(reject, new Error(t('files.error.timeout')) as T), timeout);
    signal?.addEventListener('abort', abort, { once: true });
    value.then(
      result => finish(resolve, result),
      (error: T) => finish(reject, error),
    );
    if (signal?.aborted) abort();
  });
}

const MAX_TEXT_BYTES = 8 * 1024 * 1024;

export async function readText(stream: ReadableStream<Uint8Array> | undefined, maxBytes = MAX_TEXT_BYTES): Promise<string> {
  if (!stream) return '';
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return result + decoder.decode();
      result += decoder.decode(value, { stream: true });
      if (result.length > maxBytes) throw new Error(t('files.error.outputTooLarge'));
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }
}

export async function readBytes(
  stream: ReadableStream<Uint8Array> | undefined,
  maxBytes: number,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  if (!stream) throw new Error(t('files.error.noData'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      throwIfAborted(signal);
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error(t('files.error.sizeLimit'));
      chunks.push(value);
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* already closed */
    }
    try {
      reader.releaseLock();
    } catch {
      /* released */
    }
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
