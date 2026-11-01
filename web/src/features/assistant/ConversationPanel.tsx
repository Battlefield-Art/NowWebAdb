import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { Textarea } from '@/components/ui/textarea';
import { AI_LIMITS } from '@/lib/ai/types';
import { AssistantPanel, PanelHeader } from './AssistantPanel';
import type { AssistantSession } from './useAssistantSession';
import { t } from '@/lib/i18n';

export interface ConversationPanelProps {
  session: AssistantSession;
  includeHistory: boolean;
  onIncludeHistoryChange: (value: boolean) => void;
  outgoingHistoryCount: number;
  canReview: boolean;
  sendBlockReason: string;
  onReview: () => void;
  onClear: () => void;
}

export function ConversationPanel({
  session,
  includeHistory,
  onIncludeHistoryChange,
  outgoingHistoryCount,
  canReview,
  sendBlockReason,
  onReview,
  onClear,
}: ConversationPanelProps) {
  const { history, sending } = session;

  return (
    <AssistantPanel className="flex min-w-0 flex-col">
      <PanelHeader
        step="03"
        kicker="Conversation"
        title={t('assistant.conversation.title')}
        extra={
          <Button size="sm" variant="ghost" onClick={onClear}>
            {t('assistant.conversation.clear')}
          </Button>
        }
      />
      <div className="flex min-h-0 flex-col gap-2 px-4 py-4">
        <p className="text-[11px] leading-relaxed text-muted">
          {t('assistant.conversation.limits', {
            messages: AI_LIMITS.historyMessages,
            characters: AI_LIMITS.historyCharacters,
            reply: AI_LIMITS.reply,
          })}
        </p>

        <div
          className="flex max-h-[52vh] min-h-[240px] flex-col gap-2.5 overflow-y-auto p-0.5"
          aria-label={t('assistant.conversation.aria')}
          aria-busy={sending}
        >
          {!history.length && !sending ? (
            <EmptyState icon={<MessageSquare />} title={t('assistant.conversation.emptyTitle')} description={t('assistant.conversation.emptyDescription')} />
          ) : null}

          {history.map((message, index) => (
            <article
              key={index}
              className={
                message.role === 'user'
                  ? 'rounded-[10px] border border-accent-line bg-accent-soft px-3.5 py-3'
                  : 'rounded-[10px] border border-line-soft bg-surface-2 px-3.5 py-3'
              }
            >
              <strong
                className={
                  message.role === 'user'
                    ? 'mono mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.1em] text-accent-ink'
                    : 'mono mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted'
                }
              >
                {message.role === 'user' ? t('assistant.conversation.role.user') : t('assistant.conversation.role.assistant')}
              </strong>
              <pre className="m-0 font-sans text-[12.5px] leading-[1.75] whitespace-pre-wrap break-words text-ink-soft">
                {message.content}
              </pre>
            </article>
          ))}

          {sending ? (
            <article className="rounded-[10px] border border-accent-line bg-accent-soft px-3.5 py-3">
              <strong className="mono mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.1em] text-accent-ink">
                {t('assistant.conversation.role.waiting')}
              </strong>
              <pre className="m-0 font-sans text-[12.5px] leading-[1.75] whitespace-pre-wrap break-words text-ink-soft">
                {session.pendingQuestion}
              </pre>
            </article>
          ) : null}
        </div>

        {sending ? (
          <p role="status" className="text-[11px] leading-relaxed text-muted">
            {t('assistant.conversation.requesting', { destination: session.activeDestination })}
          </p>
        ) : null}

        {session.error ? (
          <p role="alert" className="rounded-control border border-danger/25 bg-danger-soft px-3 py-2 text-[11.5px] leading-relaxed text-danger">
            {session.error}
          </p>
        ) : null}
        {session.status ? (
          <p role="status" className="text-[11px] leading-relaxed text-muted">
            {session.status}
          </p>
        ) : null}

        <div className="grid gap-2 border-t border-line-soft pt-3.5">
          <label className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-soft">
            <Checkbox
              className="mt-0.5"
              checked={includeHistory && history.length > 0}
              onCheckedChange={value => onIncludeHistoryChange(value === true)}
              disabled={sending || !history.length}
            />
            {t('assistant.conversation.includeHistory', { count: outgoingHistoryCount })}
          </label>

          <label htmlFor="ai-question" className="text-[11.5px] font-semibold text-ink-soft">
            {t('assistant.conversation.questionLabel')}
          </label>
          <Textarea
            id="ai-question"
            rows={5}
            value={session.question}
            onChange={event => session.setQuestion(event.target.value)}
            maxLength={AI_LIMITS.prompt}
            disabled={sending}
            placeholder={t('assistant.conversation.questionPlaceholder')}
            onKeyDown={event => {
              if (event.key === 'Enter' && event.ctrlKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                onReview();
              }
            }}
          />
          <p className="text-[11px] leading-relaxed text-muted">
            {t('assistant.conversation.sendNote')}
          </p>
          {sendBlockReason && !sending ? (
            <p className="text-[11px] leading-relaxed text-muted">{sendBlockReason}</p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            {sending ? (
              <Button variant="danger-ghost" onClick={session.stop}>
                {t('assistant.conversation.stop')}
              </Button>
            ) : null}
            <Button variant="primary" onClick={onReview} disabled={!canReview}>
              {t('assistant.conversation.review')}
            </Button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            {t('assistant.conversation.clearNote')}
          </p>
        </div>
      </div>
    </AssistantPanel>
  );
}
