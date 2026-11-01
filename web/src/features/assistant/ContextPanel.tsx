import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { BASIC_CONTEXT_COMMANDS } from '@/lib/ai/context';
import { AI_LIMITS } from '@/lib/ai/types';
import { AssistantPanel, PanelHeader } from './AssistantPanel';
import type { ContextCollector } from './useContextCollector';
import { t } from '@/lib/i18n';

export interface ContextPanelProps {
  collector: ContextCollector;
  locked: boolean;
}

export function ContextPanel({ collector, locked }: ContextPanelProps) {
  const disabled = locked || collector.collecting;

  return (
    <AssistantPanel>
      <PanelHeader
        step="02"
        kicker="Context"
        title={t('assistant.context.title')}
        extra={<span className="mono rounded border border-line px-1.5 py-0.5 text-[9px] tracking-[0.12em] text-muted-2">OPTIONAL</span>}
      />
      <div className="grid gap-3 px-4 py-4">
        <p className="text-[11.5px] leading-relaxed text-muted">
          {t('assistant.context.lead')}
        </p>
        <ul className="grid gap-1 rounded-control border border-line-soft bg-surface-2 px-3 py-2.5">
          {BASIC_CONTEXT_COMMANDS.map(item => (
            <li key={item.command} className="mono text-[10.5px] leading-relaxed break-all text-ink-soft">
              <span className="text-accent">$ </span>
              {item.command}
            </li>
          ))}
        </ul>
        <Button size="lg" className="w-full" onClick={() => void collector.collect()} disabled={disabled}>
          {collector.collecting ? <Spinner className="size-3.5" /> : null}
          {collector.collecting ? t('assistant.context.reading') : t('assistant.context.read')}
        </Button>
        <p className="text-[11px] leading-relaxed text-muted">
          {t('assistant.context.readHint')}
        </p>

        <label htmlFor="ai-context" className="text-[11.5px] font-semibold text-ink-soft">
          {t('assistant.context.draftLabel')}
        </label>
        <div className="grid gap-1">
          <Textarea
            id="ai-context"
            rows={8}
            value={collector.draft}
            onChange={event => collector.setDraft(event.target.value)}
            maxLength={AI_LIMITS.context}
            disabled={disabled}
            placeholder={t('assistant.context.draftPlaceholder')}
          />
          <p className="text-right text-[10.5px] text-muted-2">
            {collector.draft.length} / {AI_LIMITS.context}
          </p>
        </div>

        <label className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-soft">
          <Checkbox
            className="mt-0.5"
            checked={collector.include}
            onCheckedChange={value => collector.setInclude(value === true)}
            disabled={disabled || !collector.draft.trim()}
          />
          {t('assistant.context.include')}
        </label>
        <p className="text-[11px] leading-relaxed text-muted">
          {t('assistant.context.note', { limit: AI_LIMITS.context })}
        </p>

        {collector.error ? (
          <p role="alert" className="rounded-control border border-danger/25 bg-danger-soft px-3 py-2 text-[11.5px] leading-relaxed text-danger">
            {collector.error}
          </p>
        ) : null}
        {collector.status ? (
          <p role="status" className="text-[11px] leading-relaxed text-muted">
            {collector.status}
          </p>
        ) : null}
      </div>
    </AssistantPanel>
  );
}
