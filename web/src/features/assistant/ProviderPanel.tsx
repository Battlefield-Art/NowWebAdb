import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AssistantPanel, PanelHeader } from './AssistantPanel';
import type { AssistantConfig } from './useAssistantConfig';
import { t } from '@/lib/i18n';

export interface ProviderPanelProps {
  config: AssistantConfig;
  locked: boolean;
}

export function ProviderPanel({ config, locked }: ProviderPanelProps) {
  const [showKey, setShowKey] = useState(false);

  return (
    <AssistantPanel>
      <PanelHeader step="01" kicker="Provider" title={t('assistant.provider.title')} />
      <div className="grid gap-3 px-4 py-4">
        <Field
          label={t('assistant.provider.endpointLabel')}
          htmlFor="ai-endpoint"
          hint={t('assistant.provider.endpointHint')}
        >
          <Input
            id="ai-endpoint"
            value={config.endpoint}
            onChange={event => config.setEndpoint(event.target.value)}
            placeholder="https://api.openai.com/v1/chat/completions"
            maxLength={2048}
            autoComplete="off"
            spellCheck={false}
            disabled={locked}
            aria-invalid={Boolean(config.endpointError)}
          />
        </Field>
        {config.endpointError ? (
          <p role="alert" className="-mt-1 text-[11.5px] leading-relaxed text-danger">
            {config.endpointError}
          </p>
        ) : null}

        <div className="flex items-baseline gap-2 rounded-control border border-dashed border-line-strong bg-surface-2 px-2.5 py-2">
          <span className="shrink-0 text-[11px] text-muted">{t('assistant.provider.receiver')}</span>
          <strong className="mono min-w-0 text-[11.5px] font-medium break-all text-ink-soft">
            {config.destination || t('assistant.provider.noDestination')}
          </strong>
        </div>

        <Field label={t('assistant.provider.modelLabel')} htmlFor="ai-model">
          <Input
            id="ai-model"
            value={config.model}
            onChange={event => config.setModel(event.target.value)}
            placeholder={t('assistant.provider.modelPlaceholder')}
            maxLength={200}
            autoComplete="off"
            disabled={locked}
          />
        </Field>

        <Field label={t('assistant.provider.keyLabel')} htmlFor="ai-key" hint={t('assistant.provider.keyHint')}>
          <Input
            id="ai-key"
            type={showKey ? 'text' : 'password'}
            value={config.apiKey}
            onChange={event => config.setApiKey(event.target.value)}
            placeholder={t('assistant.provider.keyPlaceholder')}
            maxLength={4096}
            autoComplete="new-password"
            spellCheck={false}
            disabled={locked}
            trailing={
              <button
                type="button"
                aria-label={showKey ? t('assistant.provider.hideKey') : t('assistant.provider.showKey')}
                aria-pressed={showKey}
                className="grid size-6 place-items-center rounded-[5px] hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                onClick={() => setShowKey(value => !value)}
                disabled={locked}
              >
                {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            }
          />
        </Field>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] leading-relaxed text-muted">{t('assistant.provider.keyMemory')}</p>
          <Button size="sm" variant="ghost" onClick={config.clearKey} disabled={!config.apiKey || locked}>
            {t('assistant.provider.clearKey')}
          </Button>
        </div>
      </div>
    </AssistantPanel>
  );
}
