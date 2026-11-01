import { t } from '@/lib/i18n';

export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      const item = items[index] as T;
      results[index] = await task(item, index);
    }
  };
  const count = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: count }, worker));
  return results;
}

export type Release = () => void;

export function createLimiter(limit: number): { acquire: (signal?: AbortSignal) => Promise<Release> } {
  let active = 0;
  const waiting: Array<() => void> = [];
  const release = () => {
    const next = waiting.shift();
    if (next) next();
    else active--;
  };
  return {
    acquire(signal) {
      if (signal?.aborted) return Promise.reject(signal.reason ?? new Error(t('files.error.cancelled')));
      if (active < limit) {
        active++;
        return Promise.resolve(release);
      }
      return new Promise<Release>((resolve, reject) => {
        const waiter = () => {
          signal?.removeEventListener('abort', abort);
          resolve(release);
        };
        const abort = () => {
          const index = waiting.indexOf(waiter);
          if (index >= 0) waiting.splice(index, 1);
          reject(signal?.reason ?? new Error(t('files.error.cancelled')));
        };
        signal?.addEventListener('abort', abort, { once: true });
        waiting.push(waiter);
      });
    },
  };
}
