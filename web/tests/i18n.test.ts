import { describe, expect, it } from 'vitest';
import { getLocale, setLocale, t, translate, type MessageKey } from '@/lib/i18n';
import { en } from '@/lib/i18n/messages/en';
import { zh } from '@/lib/i18n/messages/zh';

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1] ?? '').sort();
}

describe('message catalogs', () => {
  it('keeps Chinese and English keys identical', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort());
  });

  it('has no duplicate keys across areas', () => {
    const modules = import.meta.glob('../src/lib/i18n/messages/zh/*.ts', { eager: true });
    const seen = new Set<string>();
    let total = 0;
    for (const [path, module] of Object.entries(modules)) {
      if (path.endsWith('/index.ts')) continue;
      for (const value of Object.values(module as Record<string, unknown>)) {
        if (!value || typeof value !== 'object') continue;
        for (const key of Object.keys(value)) {
          total += 1;
          seen.add(key);
        }
      }
    }
    expect(total).toBe(seen.size);
    expect(total).toBe(Object.keys(zh).length);
  });

  it('keeps placeholders in sync and avoids Chinese text in English copy', () => {
    for (const key of Object.keys(zh) as MessageKey[]) {
      const source = zh[key];
      const target = en[key];
      expect(target, key).toBeTruthy();
      expect(placeholders(target), key).toEqual(placeholders(source));
      if (!key.startsWith('layout.language')) {
        expect(target, key).not.toMatch(/[\u4e00-\u9fff]/);
      }
    }
  });
});

describe('translate', () => {
  it('interpolates params and picks the singular form for count 1', () => {
    expect(translate('zh-CN', 'common.time.minutes', { count: 1 })).toBe('1 分钟');
    expect(translate('en-US', 'common.time.minutes', { count: 1 })).toBe('1 minute');
    expect(translate('en-US', 'common.time.minutes', { count: 5 })).toBe('5 minutes');
  });

  it('returns the key when it is missing', () => {
    expect(translate('zh-CN', 'missing.key' as MessageKey)).toBe('missing.key');
  });
});

describe('locale store', () => {
  it('switches globally, persists the choice and updates the document language', () => {
    setLocale('en-US');
    expect(getLocale()).toBe('en-US');
    expect(document.documentElement.lang).toBe('en-US');
    expect(t('common.cancel')).toBe('Cancel');
    expect(localStorage.getItem('nowwebadb.locale')).toBe('en-US');

    setLocale('zh-CN');
    expect(t('common.cancel')).toBe('取消');
    expect(document.documentElement.lang).toBe('zh-CN');
  });
});
