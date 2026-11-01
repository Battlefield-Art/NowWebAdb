import { withDeadline } from './deadline';
import { buildChatMessages, sanitizeText } from './sanitize';
import { validateChatSettings } from './settings';
import { AI_LIMITS, AiError, type ChatRequestInput } from './types';
import { t } from '@/lib/i18n';

interface ChatCompletionPayload {
  error?: unknown;
  choices?: Array<{ message?: { content?: unknown } }>;
}

function httpError(status: number): AiError {
  if (status === 401 || status === 403) {
    return new AiError('auth', t('assistant.client.error.auth', { status: status }));
  }
  if (status === 404) {
    return new AiError('http', t('assistant.client.error.notFound'));
  }
  if (status === 429) return new AiError('rate-limit', t('assistant.client.error.rateLimit'));
  if (status >= 500) return new AiError('server', t('assistant.client.error.server', { status: status }));
  return new AiError('http', t('assistant.client.error.http', { status: status }));
}

async function readAnswer(response: Response, requestSignal: AbortSignal): Promise<string> {
  let data: ChatCompletionPayload;
  try {
    data = (await response.json()) as ChatCompletionPayload;
  } catch (error) {
    if (requestSignal.aborted || (error as { name?: unknown } | null)?.name === 'AbortError') throw error;
    throw new AiError('response', t('assistant.client.error.invalidJson'));
  }
  if (data.error) throw new AiError('response', t('assistant.client.error.provider'));
  const content = sanitizeText(data.choices?.[0]?.message?.content, AI_LIMITS.reply);
  if (!content) {
    throw new AiError('response', t('assistant.client.error.emptyReply'));
  }
  return content;
}

/** No persistence, logging, tools, cookies or redirects. Never surface provider error bodies. */
export async function requestChatCompletion(input: ChatRequestInput): Promise<string> {
  const settings = validateChatSettings(input);
  const messages = buildChatMessages(input);
  const fetchImpl = input.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new AiError('network', t('assistant.client.error.fetchUnsupported'));

  try {
    return await withDeadline(
      async (requestSignal) => {
        const response = await fetchImpl(settings.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${input.apiKey.trim()}`,
          },
          body: JSON.stringify({ model: settings.model, messages, stream: false }),
          signal: requestSignal,
          mode: 'cors',
          credentials: 'omit',
          redirect: 'error',
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
        });
        if (!response.ok) throw httpError(response.status);
        return readAnswer(response, requestSignal);
      },
      {
        signal: input.signal,
        timeoutMs: input.timeoutMs ?? 60000,
        timeoutMessage: t('assistant.client.error.timeout'),
      },
    );
  } catch (error) {
    if (error instanceof AiError) throw error;
    if ((error as { name?: unknown } | null)?.name === 'AbortError') {
      throw new AiError('aborted', t('assistant.client.error.aborted'));
    }
    throw new AiError(
      'network',
      t('assistant.client.error.network'),
    );
  }
}
