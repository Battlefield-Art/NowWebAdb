import { AdbFeature, type Adb } from '@yume-chan/adb';
import { Cmd } from '@yume-chan/android-bin';
import { throwIfAborted } from './async';
import { withSync } from './files';
import { t } from '@/lib/i18n';

function featureLabels(): Readonly<Record<string, string>> {
  return {
    [AdbFeature.ShellV2]: t('connection.capabilities.feature.shellV2'),
    [AdbFeature.Cmd]: t('connection.capabilities.cmdService'),
    [AdbFeature.StatV2]: 'stat v2（stat/lstat）',
    [AdbFeature.ListV2]: t('connection.capabilities.feature.listV2'),
    [AdbFeature.FixedPushMkdir]: t('connection.capabilities.feature.fixedPushMkdir'),
    [AdbFeature.Abb]: t('connection.capabilities.feature.abb'),
    [AdbFeature.AbbExec]: 'ABB exec',
    [AdbFeature.SendReceiveV2]: t('connection.capabilities.feature.sendReceiveV2'),
    [AdbFeature.DelayedAck]: 'delayed ack',
  };
}

export interface FeatureDescriptor {
  feature: string;
  label: string;
  supported: boolean;
}

export interface SyncCapabilities {
  statV2: boolean;
  listV2: boolean;
  fixedPushMkdir: boolean;
  sendReceiveV2: boolean;
  pushMkdirWorkaround: boolean;
}

export interface SubprocessCapabilities {
  shell: boolean;
  shellV2: boolean;
  cmd: boolean;
  abb: boolean;
  abbExec: boolean;
}

export interface AdbCapabilities {
  serial: string;
  state: string;
  model: string;
  product: string;
  device: string;
  maxPayloadSize: number;
  deviceFeatures: readonly string[];
  clientFeatures: readonly string[];
  features: readonly FeatureDescriptor[];
  subprocess: SubprocessCapabilities;
  sync: SyncCapabilities | null;
}

export function describeFeature(feature: string): string {
  return featureLabels()[feature] ?? feature;
}

function readSubprocess(adb: Adb): SubprocessCapabilities {
  const cmd = new Cmd(adb);
  const none = cmd.noneProtocol;
  const shell = cmd.shellProtocol;
  return {
    shell: Boolean(adb.subprocess.shellProtocol?.isSupported),
    shellV2: adb.canUseFeature(AdbFeature.ShellV2),
    cmd: Boolean(none?.supportsCmd || shell?.supportsCmd),
    abb: Boolean(none?.supportsAbbExec || shell?.supportsAbb),
    abbExec: Boolean(none?.supportsAbbExec),
  };
}

async function readSync(adb: Adb, signal?: AbortSignal): Promise<SyncCapabilities | null> {
  try {
    return await withSync(
      adb,
      async sync => ({
        statV2: sync.supportsStat,
        listV2: sync.supportsListV2,
        fixedPushMkdir: sync.fixedPushMkdir,
        sendReceiveV2: sync.supportsSendReceiveV2,
        pushMkdirWorkaround: sync.needPushMkdirWorkaround,
      }),
      signal,
    );
  } catch {
    throwIfAborted(signal);
    return null;
  }
}

export async function readAdbCapabilities(adb: Adb, signal?: AbortSignal): Promise<AdbCapabilities> {
  throwIfAborted(signal);
  const banner = adb.banner;
  const sync = await readSync(adb, signal);
  return {
    serial: adb.serial || t('apps.details.unknown'),
    state: banner.state ?? 'device',
    model: banner.model ?? '',
    product: banner.product ?? '',
    device: banner.device ?? '',
    maxPayloadSize: adb.maxPayloadSize,
    deviceFeatures: [...adb.deviceFeatures],
    clientFeatures: [...adb.clientFeatures],
    features: Object.values(AdbFeature).map(feature => ({
      feature,
      label: describeFeature(feature),
      supported: adb.canUseFeature(feature),
    })),
    subprocess: readSubprocess(adb),
    sync,
  };
}
