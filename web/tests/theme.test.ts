import { beforeEach, describe, expect, it } from 'vitest';
import {
  getResolvedTheme,
  getThemePreference,
  initTheme,
  setThemePreference,
} from '@/lib/theme';

function themeColor(): string | null {
  return document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null;
}

describe('theme preferences', () => {
  beforeEach(() => {
    setThemePreference('system');
    document.documentElement.classList.remove('dark');
    initTheme();
  });

  it('defaults to the system preference and applies the resolved theme', () => {
    expect(getThemePreference()).toBe('system');
    expect(getResolvedTheme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('applies and persists an explicit dark preference', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);

    setThemePreference('dark');
    expect(getResolvedTheme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(themeColor()).toBe('#131418');
    expect(localStorage.getItem('nowwebadb.theme')).toBe('dark');

    setThemePreference('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('nowwebadb.theme')).toBe('light');
    meta.remove();
  });
});
