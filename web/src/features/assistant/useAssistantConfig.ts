import { useCallback, useMemo, useState } from 'react';
import { describeAiError } from '@/lib/ai/errors';
import { validateChatSettings, validateEndpoint } from '@/lib/ai/settings';
import { t } from '@/lib/i18n';

const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export interface AssistantConfig {
  endpoint: string;
  model: string;
  apiKey: string;
  destination: string;
  endpointError: string;
  settingsError: string;
  setEndpoint: (value: string) => void;
  setModel: (value: string) => void;
  setApiKey: (value: string) => void;
  clearKey: () => void;
}

/** Deliberately no storage, URL synchronization, telemetry or global store for any input. */
export function useAssistantConfig(): AssistantConfig {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');

  const destination = useMemo(() => {
    try {
      return validateEndpoint(endpoint).host;
    } catch {
      return '';
    }
  }, [endpoint]);

  const endpointError = useMemo(() => {
    if (!endpoint) return '';
    try {
      validateEndpoint(endpoint);
      return '';
    } catch (error) {
      return describeAiError(error, t('assistant.error.endpointInvalid'));
    }
  }, [endpoint]);

  const settingsError = useMemo(() => {
    try {
      validateChatSettings({ endpoint, model, apiKey });
      return '';
    } catch (error) {
      return describeAiError(error, t('assistant.error.settingsFallback'));
    }
  }, [endpoint, model, apiKey]);

  const clearKey = useCallback(() => setApiKey(''), []);

  return {
    endpoint,
    model,
    apiKey,
    destination,
    endpointError,
    settingsError,
    setEndpoint,
    setModel,
    setApiKey,
    clearKey,
  };
}
