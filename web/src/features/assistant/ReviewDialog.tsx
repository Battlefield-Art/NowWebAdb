import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AiRole, ReviewPayload } from '@/lib/ai/types';
import { t, type MessageKey } from '@/lib/i18n';

const ROLE_LABEL_KEY: Record<AiRole, MessageKey> = {
  system: 'assistant.review.role.system',
  user: 'assistant.review.role.user',
  assistant: 'assistant.review.role.assistant',
};

export interface ReviewDialogProps {
  review: ReviewPayload | null;
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  sending: boolean;
}

export function ReviewDialog({
  review,
  acknowledged,
  onAcknowledgedChange,
  onCancel,
  onConfirm,
  sending,
}: ReviewDialogProps) {
  return (
    <Dialog open={review !== null} onOpenChange={open => { if (!open) onCancel(); }}>
      <DialogContent className="w-[min(820px,94vw)]">
        <DialogHeader>
          <DialogTitle>{t('assistant.review.title')}</DialogTitle>
          <DialogDescription>{t('assistant.review.description')}</DialogDescription>
        </DialogHeader>

        {review ? (
          <DialogBody className="grid gap-3.5">
            <div className="flex items-start gap-2 rounded-control border border-warning/25 bg-warning-soft px-3 py-2.5">
              <ShieldAlert className="mt-px size-3.5 shrink-0 text-warning" />
              <p className="text-[11.5px] leading-relaxed text-warning">{t('assistant.review.warning')}</p>
            </div>

            <dl className="grid grid-cols-[70px_minmax(0,1fr)] gap-x-3 gap-y-1.5 rounded-control border border-line-soft bg-surface-2 px-3.5 py-3 text-[12px]">
              <dt className="text-muted">{t('assistant.review.host')}</dt>
              <dd className="mono m-0 break-all text-[11.5px] text-ink-soft">{review.host}</dd>
              <dt className="text-muted">{t('assistant.review.endpoint')}</dt>
              <dd className="mono m-0 break-all text-[11.5px] text-ink-soft">{review.endpoint}</dd>
              <dt className="text-muted">{t('assistant.review.model')}</dt>
              <dd className="mono m-0 break-all text-[11.5px] text-ink-soft">{review.model}</dd>
            </dl>

            <p className="text-[11px] leading-relaxed text-muted">
              {t('assistant.review.note')}
            </p>

            <div
              className="flex max-h-[42vh] flex-col gap-2.5 overflow-y-auto rounded-control border border-line bg-surface-2 p-3"
              aria-label={t('assistant.review.transcriptAria')}
              tabIndex={0}
            >
              {review.messages.map((message, index) => (
                <article key={index} className="rounded-[10px] border border-line-soft bg-surface px-3.5 py-3">
                  <strong className="mono mb-1.5 block text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted">
                    {index + 1}. {t(ROLE_LABEL_KEY[message.role])}
                  </strong>
                  <pre className="m-0 font-sans text-[12.5px] leading-[1.75] whitespace-pre-wrap break-words text-ink-soft">
                    {message.content}
                  </pre>
                </article>
              ))}
            </div>

            <label className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-soft">
              <Checkbox
                className="mt-0.5"
                checked={acknowledged}
                onCheckedChange={value => onAcknowledgedChange(value === true)}
              />
              {t('assistant.review.acknowledge')}
            </label>
          </DialogBody>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('assistant.review.back')}
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={!review || !acknowledged || sending}>
            {t('assistant.review.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
