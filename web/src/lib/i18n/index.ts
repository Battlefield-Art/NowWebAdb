import { useCallback, useSyncExternalStore } from 'react';
import { DEFAULT_LOCALE, isLocale, type Locale, type MessageParams } from './types';
import { en } from './messages/en';
import { zh, type MessageKey } from './messages/zh';

export { LOCALES, LOCALE_LABELS, DEFAULT_LOCALE, isLocale } from './types';
export type { Locale, MessageParams } from './types';
export type { MessageKey } from './messages/zh';

export type TFunction = (key: MessageKey, params?: MessageParams) => string;

const STORAGE_KEY = 'nowwebadb.locale';
const CATALOGS: Record<Locale, Record<MessageKey, string>> = { 'zh-CN': zh, 'en-US': en };
const listeners = new Set<() => void>();

function readStoredLocale(): Locale | undefined {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
}

function detectLocale(): Locale {
  const stored = readStoredLocale();
  if (stored) return stored;
  const language = typeof navigator === 'undefined' ? '' : navigator.language.toLowerCase();
  return language.startsWith('zh') ? 'zh-CN' : 'en-US';
}

let current: Locale = detectLocale();

function applyDocumentLanguage(): void {
  if (typeof document !== 'undefined') document.documentElement.lang = current;
}

export function getLocale(): Locale {
  return current;
}

export function setLocale(next: Locale): void {
  if (!isLocale(next) || next === current) return;
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* Storage can be blocked; the in-memory switch still applies. */
  }
  applyDocumentLanguage();
  for (const listener of listeners) listener();
}

export function initLocale(): void {
  applyDocumentLanguage();
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, () => DEFAULT_LOCALE);
}

/** `key.one` wins when `params.count === 1`; unknown keys fall back to the Chinese catalog. */
export function translate(locale: Locale, key: MessageKey, params?: MessageParams): string {
  const catalog = CATALOGS[locale];
  const singular = params && params.count === 1 ? catalog[`${key}.one` as MessageKey] : undefined;
  const template = singular ?? catalog[key] ?? CATALOGS[DEFAULT_LOCALE][key];
  if (template === undefined) return key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/** Non-React modules translate with the locale that is active when they run. */
export const t: TFunction = (key, params) => translate(current, key, params);

export function useT(): TFunction {
  const locale = useLocale();
  return useCallback(
    (key: MessageKey, params?: MessageParams) => translate(locale, key, params),
    [locale],
  );
}
