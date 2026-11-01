/* eslint-disable no-control-regex -- stripping terminal control sequences is the purpose of these patterns */
import { aiSystemPrompt } from './prompt';
import { AI_LIMITS, AiError, type AiMessage } from './types';
import { t } from '@/lib/i18n';

/** Plain text only; render with text nodes, never as HTML. */
export function sanitizeText(value: unknown, limit: number = AI_LIMITS.context): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, '')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '')
    .trim()
    .slice(0, limit);
}

export function boundContext(value: unknown): string {
  return sanitizeText(value, AI_LIMITS.context);
}

/** Allowlist roles and fields; retain recent plain-text turns within both budgets. */
export function sanitizeHistory(history: readonly AiMessage[] | undefined): AiMessage[] {
  if (!Array.isArray(history)) return [];
  const result: AiMessage[] = [];
  let remaining = AI_LIMITS.historyCharacters;
  for (let index = history.length - 1; index >= 0 && result.length < AI_LIMITS.historyMessages && remaining > 0; index--) {
    const item = history[index];
    if (!item || (item.role !== 'user' && item.role !== 'assistant')) continue;
    const limit = item.role === 'user' ? AI_LIMITS.prompt : AI_LIMITS.reply;
    const content = sanitizeText(item.content, Math.min(limit, remaining));
    if (!content) continue;
    result.unshift({ role: item.role, content });
    remaining -= content.length;
  }
  while (result[0]?.role === 'assistant') result.shift();
  return result;
}

export function buildChatMessages({
  history,
  prompt,
  context = '',
}: {
  history?: readonly AiMessage[] | undefined;
  prompt: string;
  context?: string | undefined;
}): AiMessage[] {
  const question = sanitizeText(prompt, AI_LIMITS.prompt);
  if (!question) throw new AiError('prompt', t('assistant.error.questionRequired'));
  const messages: AiMessage[] = [{ role: 'system', content: aiSystemPrompt() }, ...sanitizeHistory(history)];
  const deviceContext = boundContext(context);
  if (deviceContext) {
    messages.push({
      role: 'user',
      content: t('assistant.sanitize.contextWrapper', { context: deviceContext }),
    });
  }
  messages.push({ role: 'user', content: question });
  return messages;
}
