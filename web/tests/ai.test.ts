import { collectBasicDeviceContext } from '@/lib/ai/context';
import { requestChatCompletion } from '@/lib/ai/client';
import { buildChatMessages, sanitizeHistory, sanitizeText } from '@/lib/ai/sanitize';
import { validateChatSettings, validateEndpoint } from '@/lib/ai/settings';
import { AI_LIMITS, AiError, type AiMessage } from '@/lib/ai/types';

describe('AI text sanitizing', () => {
  it('strips ANSI escapes and control characters while keeping line breaks', () => {
    const input = '\u001b[31m红色\u001b[0m\r\n第二行\u0000';
    expect(sanitizeText(input)).toBe('红色\n第二行');
  });

  it('truncates to the requested limit', () => {
    expect(sanitizeText('a'.repeat(50), 10)).toHaveLength(10);
    expect(sanitizeText('  空白  ')).toBe('空白');
    expect(sanitizeText(42)).toBe('');
  });

  it('keeps the newest turns and drops an orphaned assistant response', () => {
    const history: AiMessage[] = [
      { role: 'assistant', content: '旧的孤立回答' },
      { role: 'user', content: '问题一' },
      { role: 'assistant', content: '回答一' },
      { role: 'user', content: '问题二' },
    ];
    expect(sanitizeHistory(history)).toEqual([
      { role: 'user', content: '问题一' },
      { role: 'assistant', content: '回答一' },
      { role: 'user', content: '问题二' },
    ]);
    expect(sanitizeHistory(undefined)).toEqual([]);
  });

  it('caps history by message count', () => {
    const history: AiMessage[] = Array.from({ length: 40 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `消息 ${index}`,
    }));
    expect(sanitizeHistory(history).length).toBeLessThanOrEqual(AI_LIMITS.historyMessages);
  });
});

describe('AI endpoint validation', () => {
  it('accepts HTTPS and loopback HTTP only', () => {
    expect(validateEndpoint('https://api.example.com/v1/chat/completions').host).toBe('api.example.com');
    expect(validateEndpoint('http://127.0.0.1:8080/v1/chat/completions').host).toBe('127.0.0.1:8080');
    expect(() => validateEndpoint('http://api.example.com/v1/chat/completions')).toThrow(AiError);
  });

  it('rejects credentials, query strings and fragments', () => {
    expect(() => validateEndpoint('https://user:pass@api.example.com/v1/chat')).toThrow(AiError);
    expect(() => validateEndpoint('https://api.example.com/v1/chat?key=1')).toThrow(AiError);
    expect(() => validateEndpoint('https://api.example.com/v1/chat#frag')).toThrow(AiError);
  });

  it('requires a printable API key and model', () => {
    expect(validateChatSettings({
      endpoint: 'https://api.example.com/v1/chat',
      model: 'gpt-4o-mini',
      apiKey: 'sk-test-123',
    }).model).toBe('gpt-4o-mini');
    expect(() => validateChatSettings({
      endpoint: 'https://api.example.com/v1/chat',
      model: 'gpt-4o-mini',
      apiKey: 'key with space',
    })).toThrow(AiError);
  });
});

describe('AI chat messages', () => {
  it('wraps provided context as untrusted data and never includes the key', () => {
    const messages = buildChatMessages({
      prompt: '请分析耗电',
      context: '型号：Pixel',
      history: [{ role: 'user', content: '早先的问题' }],
    });
    expect(messages[0]?.role).toBe('system');
    expect(messages.some(message => message.content.includes('<device_context>'))).toBe(true);
    expect(messages.at(-1)).toEqual({ role: 'user', content: '请分析耗电' });
    expect(JSON.stringify(messages)).not.toContain('sk-test');
  });

  it('requires a non-empty question', () => {
    expect(() => buildChatMessages({ prompt: '   ' })).toThrow(AiError);
  });
});

describe('AI chat requests', () => {
  const settings = {
    endpoint: 'https://api.example.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    apiKey: 'sk-test-123',
    prompt: '请给出只读检查建议',
  };

  it('returns sanitized answer text', async () => {
    const fetchImpl = (async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: '\u001b[1m建议\u001b[0m' } }] }),
      }) as unknown as Response) as typeof fetch;

    await expect(requestChatCompletion({ ...settings, fetchImpl })).resolves.toBe('建议');
  });

  it('maps auth failures without exposing the provider body', async () => {
    const fetchImpl = (async () =>
      ({
        ok: false,
        status: 401,
        json: async () => ({ error: 'secret provider detail' }),
      }) as unknown as Response) as typeof fetch;

    await expect(requestChatCompletion({ ...settings, fetchImpl })).rejects.toMatchObject({
      code: 'auth',
      message: expect.not.stringContaining('secret provider detail'),
    });
  });

  it('rejects when the device is missing for context collection', async () => {
    await expect(collectBasicDeviceContext(null)).rejects.toMatchObject({ code: 'device' });
  });
});
