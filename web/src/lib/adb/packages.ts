import { IntentBuilder, PackageManager, type PackageManagerInstallOptions } from '@yume-chan/android-bin';
import type { Adb } from '@yume-chan/adb';
import { ReadableStream } from '@yume-chan/stream-extra';
import { t } from '@/lib/i18n';
import { throwIfAborted } from './async';
import { runAppCommand } from './shell';
import type { ProgressHandler, ShellOptions } from './types';

export type { PackageManagerInstallOptions };
export type AppScope = 'all' | 'thirdParty' | 'system';
export type AppEnabledFilter = 'all' | 'enabled' | 'disabled';

export interface InstalledApp {
  packageName: string;
  sourceDir?: string | undefined;
  versionCode?: number | undefined;
  installer?: string | undefined;
  uid?: number | undefined;
}

export type AppAction = 'launch' | 'stop' | 'enable' | 'disable' | 'details';

export function validatePackageName(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(value)) {
    throw new Error(t('apps.error.invalidPackage'));
  }
  return value;
}

function hasControlCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function validateApkPath(value: string): string {
  if (!value.startsWith('/') || !/\.apk$/i.test(value) || hasControlCharacter(value) ||
    value.split('/').some(part => part === '..' || part === '.')) {
    throw new Error(t('apps.error.invalidApkPath'));
  }
  return value;
}

export interface ListAppsOptions extends ShellOptions {
  scope?: AppScope;
  enabled?: AppEnabledFilter;
}

function listArgs(options: ListAppsOptions): string[] {
  const args = ['pm', 'list', 'packages', '-f'];
  if (options.scope === 'thirdParty') args.push('-3');
  if (options.scope === 'system') args.push('-s');
  if (options.enabled === 'enabled') args.push('-e');
  if (options.enabled === 'disabled') args.push('-d');
  return args;
}

async function listPackagesWithFallback(adb: Adb, options: ListAppsOptions): Promise<InstalledApp[]> {
  const pm = new PackageManager(adb);
  const query = {
    showSourceDir: true,
    showVersionCode: true,
    showInstaller: true,
    showUid: true,
    listThirdParty: options.scope === 'thirdParty',
    listSystem: options.scope === 'system',
    listEnabled: options.enabled === 'enabled',
    listDisabled: options.enabled === 'disabled',
  };
  const apps: InstalledApp[] = [];
  try {
    for await (const app of pm.listPackages(query)) {
      throwIfAborted(options.signal);
      validatePackageName(app.packageName);
      apps.push(app);
    }
    return apps;
  } catch (error) {
    throwIfAborted(options.signal);
    if (options.signal?.aborted) throw error;
    // Older Android builds may reject the optional version/installer/UID flags.
    const output = await runAppCommand(adb, listArgs(options), options);
    return output
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        if (!line.startsWith('package:')) throw new Error(t('apps.error.invalidListResponse', { line }));
        const app = PackageManager.parsePackageListItem(line.trim());
        validatePackageName(app.packageName);
        return app;
      });
  }
}

export async function listInstalledApps(adb: Adb, options: ListAppsOptions = {}): Promise<InstalledApp[]> {
  const apps = await listPackagesWithFallback(adb, options);
  return apps.sort((a, b) => a.packageName.localeCompare(b.packageName));
}

export async function getPackageSources(adb: Adb, packageName: string, signal?: AbortSignal): Promise<string[]> {
  validatePackageName(packageName);
  try {
    const sources = await new PackageManager(adb).getPackageSources(packageName);
    if (sources.length) return [...new Set(sources)];
  } catch {
    /* Some Android builds only support `pm path`. */
  }
  const output = await runAppCommand(adb, ['pm', 'path', packageName], { signal });
  return [...new Set(output.split('\n').filter(line => line.startsWith('package:')).map(line => line.slice(8).trim()))];
}

/** `pm install --user` target; mirrors the option accepted by `PackageManager`. */
export type InstallUser = number | 'current' | 'all';

export interface InstallOptions extends ShellOptions {
  onProgress?: ProgressHandler;
  installOptions?: Partial<PackageManagerInstallOptions>;
  user?: InstallUser;
}

export function parseInstallUser(value: string): InstallUser {
  if (value === 'all' || value === 'current') return value;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : 'current';
}

export interface AppInstallOptions {
  /** `-r` 覆盖安装并保留数据 */
  skipExisting: boolean;
  /** `-d` 允许版本降级 */
  requestDowngrade: boolean;
  /** `-g` 授予运行时权限 */
  grantRuntimePermissions: boolean;
  /** `-t` 允许测试包 */
  allowTest: boolean;
  /** `-f` 安装到内部存储 */
  internalStorage: boolean;
}

export const DEFAULT_APP_INSTALL_OPTIONS: AppInstallOptions = {
  skipExisting: false,
  requestDowngrade: false,
  grantRuntimePermissions: false,
  allowTest: false,
  internalStorage: false,
};

function readFileStream(file: File, signal?: AbortSignal): ReadableStream<Uint8Array> {
  const reader = file.stream().getReader();
  let ended = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        throwIfAborted(signal);
        const { value, done } = await reader.read();
        if (done) {
          ended = true;
          reader.releaseLock();
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel(reason) {
      if (!ended) await reader.cancel(reason);
    },
  });
}

function assertApkFiles(files: readonly File[]): void {
  if (!files.length || files.some(file => !/\.apk$/i.test(file.name) || !Number.isSafeInteger(file.size) || file.size <= 0)) {
    throw new Error(t('apps.error.invalidApkSelection'));
  }
}

export async function installApks(adb: Adb, files: readonly File[], options: InstallOptions = {}): Promise<void> {
  assertApkFiles(files);
  const { signal, onProgress = () => {} } = options;
  throwIfAborted(signal);
  const pm = new PackageManager(adb);
  const total = files.reduce((sum, file) => sum + file.size, 0);
  let loaded = 0;
  let sessionId: number | undefined;
  let committed = false;
  try {
    const sessionOptions =
      options.user === undefined ? options.installOptions : { ...options.installOptions, user: options.user };
    sessionId = await pm.sessionCreate(sessionOptions);
    for (const [index, file] of files.entries()) {
      throwIfAborted(signal);
      await pm.sessionAddSplitStream(sessionId, `part_${index}.apk`, file.size, readFileStream(file, signal));
      loaded += file.size;
      onProgress({ loaded, total, phase: t('apps.install.phase.upload'), file: file.name });
    }
    throwIfAborted(signal);
    onProgress({ loaded: total, total, phase: t('apps.install.phase.commit') });
    await pm.sessionCommit(sessionId);
    committed = true;
    onProgress({ loaded: total, total, phase: t('apps.install.phase.done') });
  } catch (error) {
    if (sessionId !== undefined && !committed) {
      try {
        await pm.sessionAbandon(sessionId);
      } catch {
        /* Session cleanup is best-effort. */
      }
    }
    throw error;
  }
}

export async function installDeviceApks(
  adb: Adb,
  paths: readonly string[],
  options?: Partial<PackageManagerInstallOptions>,
): Promise<string> {
  paths.forEach(validateApkPath);
  return new PackageManager(adb).install(paths, options);
}

export interface UninstallOptions extends ShellOptions {
  keepData?: boolean;
}

export async function uninstallApp(adb: Adb, packageName: string, options: UninstallOptions = {}): Promise<void> {
  validatePackageName(packageName);
  await new PackageManager(adb).uninstall(packageName, { keepData: options.keepData === true });
}

const APP_ACTIONS: Record<AppAction, (packageName: string) => readonly string[]> = {
  launch: packageName => ['monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1'],
  stop: packageName => ['am', 'force-stop', packageName],
  enable: packageName => ['pm', 'enable', packageName],
  disable: packageName => ['pm', 'disable-user', packageName],
  details: packageName => ['dumpsys', 'package', packageName],
};

export async function performAppAction(
  adb: Adb,
  packageName: string,
  action: AppAction,
  options?: ShellOptions,
): Promise<string> {
  validatePackageName(packageName);
  const output = await runAppCommand(adb, APP_ACTIONS[action](packageName), options);
  if (action === 'enable' && !/new state:\s*enabled/.test(output)) throw new Error(output || t('apps.error.enableUnconfirmed'));
  if (action === 'disable' && !/new state:\s*disabled-user/.test(output)) throw new Error(output || t('apps.error.disableUnconfirmed'));
  if (action === 'launch' && !/Events injected:\s*[1-9]/.test(output)) throw new Error(output || t('apps.error.launchFailed'));
  return output;
}

export async function resolveLauncherActivity(adb: Adb, packageName: string): Promise<string | undefined> {
  validatePackageName(packageName);
  const intent = new IntentBuilder().addCategory('android.intent.category.LAUNCHER').setPackage(packageName);
  return new PackageManager(adb).resolveActivity({ intent });
}

export async function readPackageDetails(adb: Adb, packageName: string, options?: ShellOptions): Promise<string> {
  return performAppAction(adb, packageName, 'details', options);
}
