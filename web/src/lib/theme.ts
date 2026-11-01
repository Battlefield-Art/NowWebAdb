import { useSyncExternalStore } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'nowwebadb.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const THEME_COLOR: Record<ResolvedTheme, string> = { light: '#f1efe8', dark: '#131418' };
const listeners = new Set<() => void>();

function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isPreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

let preference: ThemePreference = readStoredPreference();
const mediaQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_QUERY)
    : undefined;

export function getThemePreference(): ThemePreference {
  return preference;
}

export function getResolvedTheme(): ResolvedTheme {
  if (preference !== 'system') return preference;
  return mediaQuery?.matches ? 'dark' : 'light';
}

function apply(): void {
  if (typeof document === 'undefined') return;
  const resolved = getResolvedTheme();
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[resolved]);
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function setThemePreference(next: ThemePreference): void {
  if (!isPreference(next) || next === preference) return;
  preference = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* Storage can be blocked; the in-memory switch still applies. */
  }
  apply();
  notify();
}

export function initTheme(): void {
  apply();
  mediaQuery?.addEventListener?.('change', () => {
    if (preference !== 'system') return;
    apply();
    notify();
  });
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribeTheme, getThemePreference, () => 'system');
}

export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribeTheme, getResolvedTheme, () => 'light');
}
