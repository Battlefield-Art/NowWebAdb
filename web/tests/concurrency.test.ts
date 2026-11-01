import { describe, expect, it } from 'vitest';
import { createLimiter, mapLimit } from '@/lib/utils/concurrency';

describe('mapLimit', () => {
  it('preserves result order', async () => {
    const results = await mapLimit([3, 1, 2], 2, async value => {
      await new Promise(resolve => setTimeout(resolve, value * 2));
      return value * 10;
    });
    expect(results).toEqual([30, 10, 20]);
  });

  it('never exceeds the concurrency limit', async () => {
    let active = 0;
    let peak = 0;
    await mapLimit(Array.from({ length: 12 }, (_, index) => index), 3, async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 1));
      active -= 1;
    });
    expect(peak).toBeLessThanOrEqual(3);
  });
});

describe('createLimiter', () => {
  it('queues acquisitions beyond the limit', async () => {
    const limiter = createLimiter(1);
    const releaseFirst = await limiter.acquire();
    let secondAcquired = false;
    const second = limiter.acquire().then(release => {
      secondAcquired = true;
      release();
    });
    await Promise.resolve();
    expect(secondAcquired).toBe(false);
    releaseFirst();
    await second;
    expect(secondAcquired).toBe(true);
  });

  it('rejects pending acquisitions when aborted', async () => {
    const limiter = createLimiter(1);
    await limiter.acquire();
    const controller = new AbortController();
    const pending = limiter.acquire(controller.signal);
    controller.abort(new Error('cancelled'));
    await expect(pending).rejects.toThrow('cancelled');
  });
});
