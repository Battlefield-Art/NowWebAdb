import { useCallback, useEffect, useRef, useState } from 'react';
import { requestChatCompletion } from '@/lib/ai/client';
import { describeAiError } from '@/lib/ai/errors';
import { boundContext, buildChatMessages, sanitizeHistory, sanitizeText } from '@/lib/ai/sanitize';
import { validateChatSettings } from '@/lib/ai/settings';
import { AI_LIMITS, AiError, type AiMessage, type ReviewPayload } from '@/lib/ai/types';
import { t } from '@/lib/i18n';

export interface ReviewDraft {
  endpoint: string;
  model: string;
  apiKey: string;
  question: string;
  context: string;
  includeHistory: boolean;
}

export interface AssistantSession {
  history: AiMessage[];
  question: string;
  sending: boolean;
  pendingQuestion: string;
  activeDestination: string;
  error: string;
  status: string;
  review: ReviewPayload | null;
  acknowledged: boolean;
  setQuestion: (value: string) => void;
  setAcknowledged: (value: boolean) => void;
  openReview: (draft: ReviewDraft) => void;
  cancelReview: () => void;
  send: (apiKey: string) => Promise<void>;
  stop: () => void;
  clear: () => void;
}

export function useAssistantSession(): AssistantSession {
  const [history, setHistory] = useState<AiMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState('');
  const [activeDestination, setActiveDestination] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [review, setReview] = useState<ReviewPayload | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const cancelReview = useCallback(() => {
    setReview(null);
    setAcknowledged(false);
  }, []);

  const openReview = useCallback(
    (draft: ReviewDraft) => {
      const settings = validateChatSettings(draft);
      const prompt = sanitizeText(draft.question, AI_LIMITS.prompt);
      if (!prompt) throw new AiError('prompt', t('assistant.error.questionRequired'));
      const payload = {
        endpoint: settings.url,
        host: settings.host,
        model: settings.model,
        prompt,
        context: draft.context ? boundContext(draft.context) : '',
        history: draft.includeHistory ? sanitizeHistory(history) : [],
      };
      // A detached snapshot ensures the reviewed payload is the one sent, even after async work.
      setReview({ ...payload, messages: buildChatMessages(payload) });
      setAcknowledged(false);
      setError('');
      setStatus('');
    },
    [history],
  );

  const send = useCallback(
    async (apiKey: string) => {
      if (!review || !acknowledged || sending) return;
      const snapshot = review;
      const controller = new AbortController();
      controllerRef.current = controller;
      setSending(true);
      setPendingQuestion(snapshot.prompt);
      setActiveDestination(snapshot.host);
      setReview(null);
      setAcknowledged(false);
      setError('');
      setStatus('');
      try {
        const answer = await requestChatCompletion({
          endpoint: snapshot.endpoint,
          model: snapshot.model,
          prompt: snapshot.prompt,
          context: snapshot.context,
          history: snapshot.history,
          apiKey,
          signal: controller.signal,
        });
        if (controllerRef.current !== controller) return;
        setHistory(previous =>
          sanitizeHistory([
            ...previous,
            { role: 'user', content: snapshot.prompt },
            { role: 'assistant', content: answer },
          ]),
        );
        setQuestion('');
        setStatus(t('assistant.conversation.status.answered'));
      } catch (cause) {
        if (controllerRef.current === controller) {
          setError(describeAiError(cause, t('assistant.error.requestFallback')));
        }
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          setSending(false);
          setPendingQuestion('');
          setActiveDestination('');
        }
      }
    },
    [acknowledged, review, sending],
  );

  const stop = useCallback(() => {
    const controller = controllerRef.current;
    controllerRef.current = null;
    controller?.abort();
    setSending(false);
    setPendingQuestion('');
    setActiveDestination('');
    setError('');
    setStatus(t('assistant.conversation.status.stopped'));
  }, []);

  const clear = useCallback(() => {
    const controller = controllerRef.current;
    controllerRef.current = null;
    controller?.abort();
    setSending(false);
    setPendingQuestion('');
    setActiveDestination('');
    setReview(null);
    setAcknowledged(false);
    setHistory([]);
    setQuestion('');
    setError('');
    setStatus(t('assistant.conversation.status.cleared'));
  }, []);

  useEffect(
    () => () => {
      const controller = controllerRef.current;
      controllerRef.current = null;
      controller?.abort();
    },
    [],
  );

  return {
    history,
    question,
    sending,
    pendingQuestion,
    activeDestination,
    error,
    status,
    review,
    acknowledged,
    setQuestion,
    setAcknowledged,
    openReview,
    cancelReview,
    send,
    stop,
    clear,
  };
}
