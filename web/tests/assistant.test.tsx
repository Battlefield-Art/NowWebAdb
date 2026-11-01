import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssistantPage from '@/features/assistant/AssistantPage';

function mockAnswer(answer: string) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void input;
    void init;
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: answer } }] }),
    } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function fillConfiguration(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('模型名称（必填）'), 'gpt-4o-mini');
  await user.type(screen.getByLabelText('API Key（必填，仅内存）'), 'sk-test-123');
  await user.type(screen.getByLabelText('需要诊断的问题'), '请给出只读检查建议');
}

describe('AssistantPage review flow', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requires explicit consent after showing every outgoing message', async () => {
    const fetchMock = mockAnswer('这是测试回答');
    const user = userEvent.setup();
    render(<AssistantPage />);
    await fillConfiguration(user);

    await user.click(screen.getByRole('button', { name: '审核并发送' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('发送前审核：以下是本次请求的全部消息')).toBeInTheDocument();

    const transcript = within(dialog).getByLabelText('即将发送的全部消息');
    expect(within(transcript).getByText(/你没有工具，不能执行命令/)).toBeInTheDocument();
    expect(within(transcript).getByText('请给出只读检查建议')).toBeInTheDocument();

    const confirm = within(dialog).getByRole('button', { name: '确认发送' });
    expect(confirm).toBeDisabled();

    await user.click(within(dialog).getByRole('checkbox'));
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    expect(await screen.findByText('这是测试回答')).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe('https://api.openai.com/v1/chat/completions');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer sk-test-123');
    const body = JSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
    expect(JSON.stringify(body)).not.toContain('sk-test-123');
    expect(body.messages.at(-1)).toEqual({ role: 'user', content: '请给出只读检查建议' });
  });

  it('keeps the composer blocked until the configuration is valid', async () => {
    const user = userEvent.setup();
    render(<AssistantPage />);

    await user.type(screen.getByLabelText('需要诊断的问题'), '设备发热');
    expect(screen.getByRole('button', { name: '审核并发送' })).toBeDisabled();
    expect(screen.getByText('请填写服务支持的模型名称（最多 200 字符）。')).toBeInTheDocument();
  });
});
