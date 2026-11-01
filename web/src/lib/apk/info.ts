import type { Adb } from '@yume-chan/adb';
import { androidInt, androidRef, androidString, findChild, parseAxml } from './axml';
import type { AxmlElement } from './axml';
import { parseArsc } from './arsc';
import { findFallbackIcon, loadFileDrawable, loadIconForResource } from './drawable';
import { renderDrawable } from './render';
import type { IconOptions } from './render';
import type { ParsedResources, ResLocale, ResourceResolver } from './resources';
import { RemoteApk } from './zip';
import { t } from '@/lib/i18n';

const MANIFEST_LIMIT = 8 * 1024 * 1024;
const ARSC_LIMIT = 48 * 1024 * 1024;
const NO_RESOURCES: ResourceResolver = { getColor: () => null, getDrawableCandidates: () => [] };

export interface AppInfoTarget {
  packageName: string;
  sourceDir: string;
  versionName?: string | undefined;
  versionCode?: number | undefined;
}

export interface ExtractedAppInfo {
  appName: string;
  versionName: string;
  versionCode: number | undefined;
  minSdk: number | null;
  targetSdk: number | null;
  permissions: string[];
  iconBase64: string;
}

export interface ExtractAppInfoOptions extends IconOptions {
  locale?: string;
}

export async function extractAppInfo(
  adb: Adb,
  app: AppInfoTarget,
  { signal, timeout = 30000, locale }: ExtractAppInfoOptions = {},
): Promise<ExtractedAppInfo> {
  const zip = new RemoteApk(adb, app.sourceDir, { signal, timeout });
  let manifestBytes: Uint8Array;
  try {
    manifestBytes = await zip.readEntry('AndroidManifest.xml', { maxSize: MANIFEST_LIMIT, signal, timeout });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(t('apps.error.manifestRead', { message: message }));
  }
  const manifest = readManifest(parseAxml(manifestBytes));

  let resources: ParsedResources | null = null;
  try {
    const arsc = await zip.readEntry('resources.arsc', { maxSize: ARSC_LIMIT, signal, timeout });
    resources = parseArsc(arsc);
  } catch {
    /* Manifest still yields package/version even without resources. */
  }

  const preferredLocale = resolveLocale(locale);
  let appName = manifest.label.startsWith('@') ? '' : manifest.label;
  if (resources && manifest.labelRef) {
    appName = resources.getString(manifest.labelRef, preferredLocale) || appName;
  }
  appName = cleanText(appName || app.packageName) || app.packageName;

  let iconBase64 = '';
  if (manifest.iconLiteral) {
    try {
      const drawable = await loadFileDrawable(zip, resources || NO_RESOURCES, manifest.iconLiteral, {
        signal,
        timeout,
      });
      iconBase64 = (await renderDrawable(drawable)) || '';
    } catch {
      /* Fall through to the standard launcher icon lookup. */
    }
  }
  if (!iconBase64 && resources && (manifest.iconRef || manifest.roundIconRef)) {
    try {
      iconBase64 = await loadIconForResource(zip, resources, manifest.iconRef || manifest.roundIconRef, {
        signal,
        timeout,
      });
    } catch {
      /* Keep the generic icon when one APK entry is malformed. */
    }
  }
  if (!iconBase64) {
    try {
      iconBase64 = await findFallbackIcon(zip, { signal, timeout });
    } catch {
      /* No usable launcher image. */
    }
  }

  return {
    appName,
    versionName: cleanText(manifest.versionName) || cleanText(app.versionName) || '',
    versionCode: manifest.versionCode ?? app.versionCode,
    minSdk: manifest.minSdk,
    targetSdk: manifest.targetSdk,
    permissions: manifest.permissions,
    iconBase64,
  };
}

interface ManifestInfo {
  labelRef: number;
  label: string;
  iconRef: number;
  roundIconRef: number;
  iconLiteral: string;
  versionName: string;
  versionCode: number | null;
  minSdk: number | null;
  targetSdk: number | null;
  permissions: string[];
}

function readManifest(root: AxmlElement): ManifestInfo {
  const application = findChild(root, 'application');
  const usesSdk = findChild(root, 'uses-sdk');
  const permissions = root.children
    .filter(child => child.name === 'uses-permission' || child.name === 'uses-permission-sdk-23')
    .map(child => androidString(child, 'name'))
    .filter(Boolean);
  const iconRaw = androidString(application, 'icon');
  return {
    labelRef: androidRef(application, 'label'),
    label: androidString(application, 'label'),
    iconRef: androidRef(application, 'icon'),
    roundIconRef: androidRef(application, 'roundIcon'),
    iconLiteral: /^(?:res\/|assets\/).+\.(?:png|webp|jpe?g|xml)$/i.test(iconRaw) ? iconRaw : '',
    versionName: androidString(root, 'versionName'),
    versionCode: androidInt(root, 'versionCode'),
    minSdk: androidInt(usesSdk, 'minSdkVersion'),
    targetSdk: androidInt(usesSdk, 'targetSdkVersion'),
    permissions,
  };
}

function resolveLocale(value: string | undefined): ResLocale {
  const raw = value || (typeof navigator !== 'undefined' ? navigator.language : '') || 'en-US';
  const [language, region] = raw.toLowerCase().split('-');
  return { language: language || '', region: region || '' };
}

function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  let text = '';
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code > 0x1f && code !== 0x7f) text += char;
  }
  return text.trim();
}
