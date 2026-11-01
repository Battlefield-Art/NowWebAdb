import type { Adb } from '@yume-chan/adb';
import { exec } from '@/lib/adb/shell';
import { withDeadline } from './deadline';
import { boundContext, sanitizeText } from './sanitize';
import { AiError, type DeviceContextCommand } from './types';
import { t } from '@/lib/i18n';

export const BASIC_CONTEXT_COMMANDS: readonly DeviceContextCommand[] = Object.freeze([
  Object.freeze({ labelKey: 'assistant.context.label.model', command: 'getprop ro.product.model', limit: 160 }),
  Object.freeze({
    labelKey: 'assistant.context.label.androidVersion',
    command: 'getprop ro.build.version.release',
    limit: 80,
  }),
  Object.freeze({ labelKey: 'assistant.context.label.battery', command: 'dumpsys battery', limit: 1000 }),
  Object.freeze({ labelKey: 'assistant.context.label.storage', command: 'df -h /data', limit: 1600 }),
]);

const BATTERY_LINE = /^\s*(?:level|scale|status|health|present|voltage|temperature|technology):/i;

function readSection(output: string, item: DeviceContextCommand): string {
  const text = sanitizeText(output, item.limit);
  if (item.command !== 'dumpsys battery') return text;
  return text.split('\n').filter(line => BATTERY_LINE.test(line)).join('\n');
}

/** Explicit user action only. No app inventory, identifiers, screenshots or logs. */
export async function collectBasicDeviceContext(
  adb: Adb | null,
  { signal, timeoutMs = 15000 }: { signal?: AbortSignal | undefined; timeoutMs?: number } = {},
): Promise<string> {
  if (!adb) throw new AiError('device', t('assistant.context.error.noDevice'));

  return withDeadline(
    async (collectionSignal) => {
      const sections: string[] = [];
      for (const item of BASIC_CONTEXT_COMMANDS) {
        if (collectionSignal.aborted) throw new AiError('aborted', t('assistant.context.error.aborted'));
        let result;
        try {
          result = await exec(adb, item.command, { signal: collectionSignal, timeout: timeoutMs });
        } catch {
          if (collectionSignal.aborted) throw new AiError('aborted', t('assistant.context.error.aborted'));
          throw new AiError(
            'device',
            t('assistant.context.error.readFailed', { label: t(item.labelKey) }),
          );
        }
        if (collectionSignal.aborted) throw new AiError('aborted', t('assistant.context.error.aborted'));
        if (result.exitCode !== 0) {
          throw new AiError('device', t('assistant.context.error.exitCode', { label: t(item.labelKey) }));
        }
        const output = readSection(result.stdout, item);
        if (!output) {
          throw new AiError('device', t('assistant.context.error.empty', { label: t(item.labelKey) }));
        }
        sections.push(t('assistant.context.section', { label: t(item.labelKey), output }));
      }
      return boundContext(sections.join('\n\n'));
    },
    { signal, timeoutMs, timeoutMessage: t('assistant.context.error.timeout') },
  );
}
