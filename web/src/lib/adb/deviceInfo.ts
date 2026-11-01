import { DumpSys } from '@yume-chan/android-bin';
import type { Adb } from '@yume-chan/adb';
import { formatBytes } from '@/lib/utils/format';
import { withTimeout } from './async';
import { getAllProps, getProps } from './props';
import type { CommandInput } from './shell';
import { execText } from './shell';

export interface BatteryInfo {
  level: number;
  voltage: number;
  temperature: number;
  status: number;
  health: number;
  charging: boolean;
}

export interface StorageInfo {
  total: number;
  used: number;
  usedPercent: number;
  totalLabel: string;
  usedLabel: string;
}

export interface MemoryInfo {
  totalMB: number;
  usedMB: number;
  usedPercent: number;
}

export interface CpuInfo {
  abi: string;
  abis: string[];
  cores: number;
  minMHz: number;
  maxMHz: number;
  currentMHz: number;
}

export interface DeviceSnapshot {
  serial: string;
  model: string;
  manufacturer: string;
  brand: string;
  product: string;
  device: string;
  board: string;
  hardware: string;
  androidVersion: string;
  sdk: string;
  buildId: string;
  display: string;
  fingerprint: string;
  tags: string;
  buildType: string;
  bootloader: string;
  kernelVersion: string;
  resolution: string;
  density: number;
  cpu: CpuInfo;
  memory: MemoryInfo;
  storage: StorageInfo;
  network: { ip: string; wifi: string };
  battery: BatteryInfo;
  uptimeSeconds: number;
  capturedAt: number;
}

const SNAPSHOT_KEYS = [
  'ro.product.model',
  'ro.product.manufacturer',
  'ro.product.brand',
  'ro.product.name',
  'ro.product.device',
  'ro.product.board',
  'ro.product.cpu.abi',
  'ro.product.cpu.abilist',
  'ro.build.version.release',
  'ro.build.version.sdk',
  'ro.build.id',
  'ro.build.display.id',
  'ro.build.fingerprint',
  'ro.build.tags',
  'ro.build.type',
  'ro.boot.verifiedbootstate',
  'ro.boot.slot_suffix',
  'ro.sf.lcd_density',
] as const;

const EMPTY_BATTERY: BatteryInfo = { level: 0, voltage: 0, temperature: 0, status: 0, health: 0, charging: false };

function number(value: string | undefined): number {
  const parsed = Number.parseInt((value ?? '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseResolution(text: string): string {
  const physical = /Physical size:\s*(\d+)\s*x\s*(\d+)/i.exec(text);
  if (physical) return `${physical[1]}×${physical[2]}`;
  const override = /Override size:\s*(\d+)\s*x\s*(\d+)/i.exec(text);
  return override ? `${override[1]}×${override[2]}` : '';
}

export function parseMemoryUsage(text: string): MemoryInfo {
  const values = text.trim().split(/\s+/).map(value => number(value));
  const totalMB = values[0] ?? 0;
  const usedMB = values[1] ?? 0;
  return { totalMB, usedMB, usedPercent: totalMB > 0 ? (usedMB / totalMB) * 100 : 0 };
}

export function parseStorageUsage(text: string): StorageInfo {
  const lines = text.trim().split('\n').filter(line => line.trim());
  const last = lines[lines.length - 1] ?? '';
  const fields = last.trim().split(/\s+/);
  const totalKB = number(fields[1]);
  const usedKB = number(fields[2]);
  const percent = number((fields[4] ?? '').replace('%', ''));
  const total = totalKB * 1024;
  const used = usedKB * 1024;
  return {
    total,
    used,
    usedPercent: Number.isFinite(percent) ? percent : total > 0 ? (used / total) * 100 : 0,
    totalLabel: formatBytes(total),
    usedLabel: formatBytes(used),
  };
}

export function parseCpuFrequencies(text: string): Pick<CpuInfo, 'minMHz' | 'maxMHz' | 'currentMHz'> {
  const values = text
    .trim()
    .split('\n')
    .map(line => number(line.replace(/\D/g, '')));
  return {
    minMHz: Math.round((values[0] ?? 0) / 1000),
    maxMHz: Math.round((values[1] ?? 0) / 1000),
    currentMHz: Math.round((values[2] ?? 0) / 1000),
  };
}

export function parseIpAddress(text: string): string {
  const match = /inet\s+(\d{1,3}(?:\.\d{1,3}){3})/.exec(text);
  return match?.[1] ?? '';
}

export function parseWifiName(text: string): string {
  const connected = /connected to "([^"]+)"/i.exec(text);
  if (connected?.[1]) return connected[1];
  const ssid = /SSID:\s*([^,\n]+)/.exec(text);
  return ssid?.[1]?.trim().replace(/^"|"$/g, '') ?? '';
}

async function readWifiName(adb: Adb, signal?: AbortSignal): Promise<string> {
  try {
    const status = await execText(adb, ['cmd', 'wifi', 'status'], { signal, timeout: 6000 });
    const name = parseWifiName(status);
    if (name) return name;
  } catch {
    /* Fall through to dumpsys */
  }
  try {
    const dump = await execText(adb, 'dumpsys wifi 2>/dev/null | grep -m1 "SSID:"', { signal, timeout: 6000 });
    return parseWifiName(dump);
  } catch {
    return '';
  }
}

async function readBattery(adb: Adb, signal?: AbortSignal): Promise<BatteryInfo> {
  try {
    const info = await withTimeout(new DumpSys(adb).battery(), 6000, signal);
    return {
      level: info.level ?? 0,
      voltage: info.voltage ?? 0,
      temperature: (info.temperature ?? 0) / 10,
      status: info.status,
      health: info.health,
      charging: Boolean(info.acPowered || info.usbPowered || info.wirelessPowered),
    };
  } catch {
    return { ...EMPTY_BATTERY };
  }
}

async function readProps(adb: Adb, signal?: AbortSignal): Promise<Record<string, string>> {
  try {
    return await getAllProps(adb, { signal });
  } catch {
    return getProps(adb, SNAPSHOT_KEYS, signal);
  }
}

async function safeText(adb: Adb, command: CommandInput, signal?: AbortSignal, timeout = 8000): Promise<string> {
  try {
    return await execText(adb, command, { signal, timeout });
  } catch {
    return '';
  }
}

export async function readDeviceSnapshot(adb: Adb, options: { signal?: AbortSignal } = {}): Promise<DeviceSnapshot> {
  const { signal } = options;
  const [props, resolutionText, memoryText, storageText, ipText, cpuText, kernelText, uptimeText, wifi, battery] = await Promise.all([
    readProps(adb, signal),
    safeText(adb, ['wm', 'size'], signal),
    safeText(adb, "free -m 2>/dev/null | awk '/Mem/ {print $2\" \"$3; exit}'", signal),
    safeText(adb, 'df -k /data 2>/dev/null', signal),
    safeText(adb, 'ip addr show wlan0 2>/dev/null', signal),
    safeText(
      adb,
      'cat /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_min_freq 2>/dev/null; ' +
        'cat /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq 2>/dev/null; ' +
        'cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq 2>/dev/null',
      signal,
    ),
    safeText(adb, 'uname -r 2>/dev/null', signal),
    safeText(adb, 'cat /proc/uptime 2>/dev/null', signal),
    readWifiName(adb, signal ?? undefined),
    readBattery(adb, signal),
  ]);
  const prop = (key: string): string => (props[key] ?? '').trim();
  const abi = prop('ro.product.cpu.abi');
  const abis = prop('ro.product.cpu.abilist').split(',').filter(Boolean);
  const slot = prop('ro.boot.slot_suffix');
  return {
    serial: adb.serial || prop('ro.serialno'),
    model: prop('ro.product.model'),
    manufacturer: prop('ro.product.manufacturer'),
    brand: prop('ro.product.brand'),
    product: prop('ro.product.name'),
    device: prop('ro.product.device'),
    board: prop('ro.product.board'),
    hardware: prop('ro.hardware'),
    androidVersion: prop('ro.build.version.release'),
    sdk: prop('ro.build.version.sdk'),
    buildId: prop('ro.build.id'),
    display: prop('ro.build.display.id'),
    fingerprint: prop('ro.build.fingerprint'),
    tags: prop('ro.build.tags'),
    buildType: prop('ro.build.type'),
    bootloader: [prop('ro.boot.verifiedbootstate'), slot].filter(Boolean).join(' · '),
    kernelVersion: kernelText.trim() || prop('ro.kernel.version'),
    resolution: parseResolution(resolutionText),
    density: number(prop('ro.sf.lcd_density')),
    cpu: {
      abi,
      abis: abis.length ? abis : abi ? [abi] : [],
      cores: number(await safeText(adb, 'nproc 2>/dev/null')),
      ...parseCpuFrequencies(cpuText),
    },
    memory: parseMemoryUsage(memoryText),
    storage: parseStorageUsage(storageText),
    network: { ip: parseIpAddress(ipText), wifi },
    battery,
    uptimeSeconds: Math.floor(Number.parseFloat(uptimeText) || 0),
    capturedAt: Date.now(),
  };
}

export async function getBatteryInfo(adb: Adb, signal?: AbortSignal): Promise<BatteryInfo> {
  return readBattery(adb, signal);
}

export async function getStorageInfo(adb: Adb, signal?: AbortSignal): Promise<StorageInfo> {
  return parseStorageUsage(await safeText(adb, 'df -k /data 2>/dev/null', signal));
}

export async function getMemoryInfo(adb: Adb, signal?: AbortSignal): Promise<MemoryInfo> {
  return parseMemoryUsage(await safeText(adb, "free -m 2>/dev/null | awk '/Mem/ {print $2\" \"$3; exit}'", signal));
}
