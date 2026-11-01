/* eslint-disable no-control-regex -- rejecting control characters in URLs and keys is intentional */
import { AiError, type ChatSettings, type EndpointAddress } from './types';
import { t } from '@/lib/i18n';

const LOOPBACK_IPV4 = /^127(?:\.\d{1,3}){3}$/;

/** Keep complete custom paths; never append a provider-specific suffix. */
export function validateEndpoint(value: unknown): EndpointAddress {
  const input = typeof value === 'string' ? value.trim() : '';
  if (!input || input.length > 2048 || !/^https?:\/\//i.test(input) || /[\s\\\u0000-\u001f\u007f]/.test(input)) {
    throw new AiError('endpoint', t('assistant.settings.endpointRequired'));
  }
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new AiError('endpoint', t('assistant.error.endpointInvalid'));
  }
  // Query strings/fragments are deliberately unsupported: credentials belong only in the header.
  if (url.username || url.password || (input.split('/')[2] ?? '').includes('@') || /[?#]/.test(input)) {
    throw new AiError('endpoint', t('assistant.settings.endpointCredentials'));
  }
  const loopback = url.hostname === 'localhost' || url.hostname === '[::1]' || LOOPBACK_IPV4.test(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new AiError('endpoint', t('assistant.settings.endpointProtocol'));
  }
  return { url: url.href, host: url.host, protocol: url.protocol };
}

export function validateChatSettings({
  endpoint,
  model,
  apiKey,
}: {
  endpoint?: unknown;
  model?: unknown;
  apiKey?: unknown;
}): ChatSettings {
  const address = validateEndpoint(endpoint);
  const modelName = typeof model === 'string' ? model.trim() : '';
  if (!modelName || modelName.length > 200 || /[\u0000-\u001f\u007f]/.test(modelName)) {
    throw new AiError('model', t('assistant.settings.modelRequired'));
  }
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';
  if (!key || key.length > 4096 || /[^\x21-\x7e]/.test(key)) {
    throw new AiError('key', t('assistant.settings.keyRequired'));
  }
  return { ...address, model: modelName };
}
