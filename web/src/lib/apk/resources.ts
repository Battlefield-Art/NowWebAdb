import { VALUE_TYPE, parseColorText } from './binary';

export interface ResConfig {
  density: number;
  language: string;
  country: string;
}

export interface ResLocale {
  language: string;
  region: string;
}

export interface ResourceEntry {
  key: string;
  dataType: number;
  data: number;
  config: ResConfig;
  typeName: string;
}

export type DrawableCandidate =
  | { path: string; density: number; config: ResConfig }
  | { color: number; density: number; config: ResConfig };

export interface ResourceResolver {
  getColor: (resId: number, depth?: number) => number | null;
  getDrawableCandidates: (resId: number) => DrawableCandidate[];
}

export interface ResourcePackage {
  packageId: number;
  typePool: string[];
  keyPool: string[];
}

export interface ParsedResources extends ResourceResolver {
  globalStrings: string[];
  entries: Map<number, ResourceEntry[]>;
  packages: ResourcePackage[];
  getString: (resId: number, locale?: ResLocale) => string;
}

export function createResources(
  globalStrings: string[],
  entries: Map<number, ResourceEntry[]>,
  packages: ResourcePackage[],
): ParsedResources {
  const localeInfo = (): ResLocale => {
    const locale = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
    const [language, region] = locale.toLowerCase().split('-');
    return { language: language || '', region: region || '' };
  };

  function getStringWithDepth(resId: number, locale: ResLocale, depth: number): string {
    if (depth > 8) return '';
    const candidates = entries.get(resId >>> 0);
    if (!candidates?.length) return '';
    const scored = candidates
      .map(entry => ({ entry, score: stringScore(entry.config, locale) }))
      .sort((a, b) => b.score - a.score);
    for (const { entry } of scored) {
      if (entry.dataType === VALUE_TYPE.REFERENCE) {
        const nested = getStringWithDepth(entry.data, locale, depth + 1);
        if (nested) return nested;
        continue;
      }
      if (entry.dataType === VALUE_TYPE.STRING) return globalStrings[entry.data] || '';
    }
    return '';
  }

  function getString(resId: number, locale: ResLocale = localeInfo()): string {
    return getStringWithDepth(resId, locale, 0);
  }

  function getDrawableCandidates(resId: number): DrawableCandidate[] {
    const candidates = entries.get(resId >>> 0);
    if (!candidates?.length) return [];
    const result: DrawableCandidate[] = [];
    const seen = new Set<string>();
    const walk = (list: readonly ResourceEntry[], depth: number): void => {
      if (depth > 8) return;
      for (const entry of list) {
        if (entry.dataType === VALUE_TYPE.REFERENCE) {
          walk(entries.get(entry.data >>> 0) || [], depth + 1);
        } else if (entry.dataType === VALUE_TYPE.STRING) {
          const path = globalStrings[entry.data] || '';
          if (!path) continue;
          const key = `${path}|${entry.config.density}`;
          if (seen.has(key)) continue;
          seen.add(key);
          result.push({ path, density: entry.config.density, config: entry.config });
        } else if (entry.dataType >= VALUE_TYPE.FIRST_COLOR && entry.dataType <= VALUE_TYPE.LAST_COLOR) {
          result.push({ color: entry.data >>> 0, density: entry.config.density, config: entry.config });
        }
      }
    };
    walk(candidates, 0);
    return result;
  }

  function getColor(resId: number, depth = 0): number | null {
    if (depth > 8) return null;
    const candidates = entries.get(resId >>> 0);
    if (!candidates?.length) return null;
    for (const entry of candidates) {
      if (entry.dataType === VALUE_TYPE.REFERENCE) {
        const nested = getColor(entry.data, depth + 1);
        if (nested !== null) return nested;
      } else if (entry.dataType >= VALUE_TYPE.FIRST_COLOR && entry.dataType <= VALUE_TYPE.LAST_COLOR) {
        return entry.data >>> 0;
      } else if (entry.dataType === VALUE_TYPE.STRING) {
        const text = globalStrings[entry.data] || '';
        const parsed = parseColorText(text);
        if (parsed !== null) return parsed;
      }
    }
    return null;
  }

  return { globalStrings, entries, packages, getString, getDrawableCandidates, getColor };
}

function stringScore(config: ResConfig, locale: ResLocale): number {
  if (!config.language) return 10;
  let score = 0;
  if (config.language === locale.language) score = 30;
  if (score && locale.region && config.country === locale.region) score = 40;
  return score;
}
