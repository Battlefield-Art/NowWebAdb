import type { MessageKey } from '@/lib/i18n';

export const AI_LIMITS = Object.freeze({
  context: 6000,
  prompt: 4000,
  reply: 8000,
  historyMessages: 12,
  historyCharacters: 24000,
});

export type AiRole = 'system' | 'user' | 'assistant';

export interface AiMessage {
  role: AiRole;
  content: string;
}

export type AiErrorCode =
  | 'endpoint'
  | 'model'
  | 'key'
  | 'prompt'
  | 'aborted'
  | 'timeout'
  | 'timeout-setting'
  | 'auth'
  | 'http'
  | 'rate-limit'
  | 'server'
  | 'response'
  | 'network'
  | 'device';

export class AiError extends Error {
  readonly code: AiErrorCode;

  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = 'AiError';
    this.code = code;
  }
}

export interface EndpointAddress {
  url: string;
  host: string;
  protocol: string;
}

export interface ChatSettings extends EndpointAddress {
  model: string;
}

export interface ChatRequestInput {
  endpoint: string;
  model: string;
  apiKey: string;
  prompt: string;
  context?: string;
  history?: readonly AiMessage[];
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Detached snapshot prepared for review; never contains the API key. */
export interface ReviewPayload {
  endpoint: string;
  host: string;
  model: string;
  prompt: string;
  context: string;
  history: AiMessage[];
  messages: AiMessage[];
}

export interface DeviceContextCommand {
  readonly labelKey: MessageKey;
  readonly command: string;
  readonly limit: number;
}
