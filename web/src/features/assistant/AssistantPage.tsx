import { useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { describeAiError } from '@/lib/ai/errors';
import { sanitizeHistory, sanitizeText } from '@/lib/ai/sanitize';
import { AI_LIMITS } from '@/lib/ai/types';
import { selectAdb, useDeviceStore } from '@/stores/device';
import { ContextPanel } from './ContextPanel';
import { ConversationPanel } from './ConversationPanel';
import { ProviderPanel } from './ProviderPanel';
import { ReviewDialog } from './ReviewDialog';
import { useAssistantConfig } from './useAssistantConfig';
import { useAssistantSession } from './useAssistantSession';
import { useContextCollector } from './useContextCollector';
import { t } from '@/lib/i18n';

export default function AssistantPage() {
  const adb = useDeviceStore(selectAdb);
  const config = useAssistantConfig();
  const session = useAssistantSession();
  const locked = session.sending || session.review !== null;
  const context = useContextCollector(adb, locked);
  const [includeHistory, setIncludeHistory] = useState(true);

  const outgoingHistory = useMemo(
    () => (includeHistory ? sanitizeHistory(session.history) : []),
    [includeHistory, session.history],
  );

  const sendBlockReason = useMemo(() => {
    if (config.settingsError) return config.settingsError;
    if (!sanitizeText(session.question, AI_LIMITS.prompt)) return t('assistant.page.emptyQuestion');
    if (context.collecting) return t('assistant.page.waitCollecting');
    return '';
  }, [config.settingsError, context.collecting, session.question]);

  const canReview = !locked && !sendBlockReason;

  const handleReview = () => {
    if (!canReview) return;
    try {
      session.openReview({
        endpoint: config.endpoint,
        model: config.model,
        apiKey: config.apiKey,
        question: session.question,
        context: context.include ? context.draft : '',
        includeHistory,
      });
    } catch (cause) {
      toast.error(describeAiError(cause, t('assistant.page.prepareFailed')));
    }
  };

  const handleClear = () => {
    session.clear();
    context.reset();
    setIncludeHistory(true);
  };

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-2">
            Assistant / Diagnostics
          </p>
          <h1 className="mt-1 text-[20px] font-bold tracking-[-0.02em] text-ink">{t('assistant.page.title')}</h1>
          <p className="mt-1 max-w-[720px] text-[11.5px] leading-relaxed text-muted">
            {t('assistant.page.lead')}
          </p>
        </div>
        <Badge tone="success" className="gap-1.5">
          <ShieldCheck className="size-3" />
          {t('assistant.page.badge')}
        </Badge>
      </header>

      <div className="flex items-start gap-3.5 rounded-[14px] border border-line bg-surface-2 px-4 py-3.5">
        <span className="mono shrink-0 rounded border border-accent-line bg-accent-soft px-1.5 py-0.5 text-[9.5px] font-semibold tracking-[0.14em] text-accent-ink">
          PRIVACY
        </span>
        <div>
          <strong className="block text-[12.5px] font-semibold text-ink">{t('assistant.page.reviewNoticeTitle')}</strong>
          <p className="mt-1 max-w-[1100px] text-[11.5px] leading-relaxed text-muted">
            {t('assistant.page.reviewNotice')}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(300px,368px)_minmax(0,1fr)] xl:items-start">
        <div className="grid gap-4">
          <ProviderPanel config={config} locked={locked} />
          <ContextPanel collector={context} locked={locked} />
        </div>
        <ConversationPanel
          session={session}
          includeHistory={includeHistory}
          onIncludeHistoryChange={setIncludeHistory}
          outgoingHistoryCount={outgoingHistory.length}
          canReview={canReview}
          sendBlockReason={sendBlockReason}
          onReview={handleReview}
          onClear={handleClear}
        />
      </div>

      <ReviewDialog
        review={session.review}
        acknowledged={session.acknowledged}
        onAcknowledgedChange={session.setAcknowledged}
        onCancel={session.cancelReview}
        onConfirm={() => void session.send(config.apiKey)}
        sending={session.sending}
      />
    </div>
  );
}
