import { t } from '@/lib/i18n';

export async function inflateRaw(compressed: Uint8Array, maxSize: number): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'function') throw new Error(t('apps.error.inflateUnsupported'));
  const stream = new Blob([compressed.slice()]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxSize) throw new Error(t('apps.inflate.tooLargeAfter'));
      chunks.push(value);
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* closed */
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
