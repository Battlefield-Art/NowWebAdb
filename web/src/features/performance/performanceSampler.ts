import type { Adb } from '@yume-chan/adb';
import { getForegroundApp, type ForegroundApp } from '@/lib/adb/activity';
import {
  readBattery,
  readCpuAndNetwork,
  readFrameCounters,
  readProcessMemory,
} from '@/lib/adb/performance';

export interface PerformanceSample {
  timestamp: number;
  cpuApp: number | null;
  cpuSystem: number | null;
  memoryMB: number | null;
  fps: number | null;
  janky: number | null;
  rxKbps: number | null;
  txKbps: number | null;
  batteryLevel: number | null;
  batteryTemp: number | null;
}

export interface SamplerResult {
  sample: PerformanceSample;
  foreground: ForegroundApp | null;
}

interface Timed<T> {
  value: T;
  at: number;
}

const BATTERY_TTL = 10_000;
const FOREGROUND_TTL = 5_000;

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function attempt<T>(task: Promise<T>): Promise<T | null> {
  try {
    return await task;
  } catch {
    return null;
  }
}

export class PerformanceSampler {
  private cpu: (Timed<{ total: number; idle: number; process: number }>) | null = null;
  private net: (Timed<{ rx: number; tx: number }>) | null = null;
  private frames: (Timed<{ frames: number }>) | null = null;
  private battery: Timed<{ level: number; temperature: number }> | null = null;
  private foreground: Timed<ForegroundApp | null> | null = null;

  constructor(
    private readonly adb: Adb,
    private readonly pid: string,
    private readonly packageName: string,
  ) {}

  async sample(signal?: AbortSignal): Promise<SamplerResult> {
    const now = Date.now();
    const batteryStale = !this.battery || now - this.battery.at > BATTERY_TTL;
    const foregroundStale = !this.foreground || now - this.foreground.at > FOREGROUND_TTL;
    const [io, memory, frames, battery, foreground] = await Promise.all([
      attempt(readCpuAndNetwork(this.adb, this.pid, { signal })),
      attempt(readProcessMemory(this.adb, this.pid, { signal })),
      attempt(readFrameCounters(this.adb, this.packageName, { signal })),
      batteryStale ? attempt(readBattery(this.adb, signal)) : Promise.resolve(null),
      foregroundStale ? attempt(getForegroundApp(this.adb, signal)) : Promise.resolve(null),
    ]);

    if (battery && (battery.level > 0 || battery.voltage > 0)) {
      this.battery = { value: { level: battery.level, temperature: battery.temperature }, at: now };
    }
    if (foregroundStale) this.foreground = { value: foreground, at: now };

    const sample: PerformanceSample = {
      timestamp: now,
      ...this.cpuUsage(io?.cpu ?? null, io?.processTicks ?? null),
      memoryMB: memory ?? null,
      ...this.frameRate(frames, now),
      ...this.networkRate(io?.network ?? null, now),
      batteryLevel: this.battery ? clamp(this.battery.value.level, 0, 100) : null,
      batteryTemp: this.battery && this.battery.value.temperature > 0
        ? round(this.battery.value.temperature, 1)
        : null,
    };
    return { sample, foreground: this.foreground?.value ?? null };
  }

  private cpuUsage(
    cpu: { total: number; idle: number } | null,
    process: number | null,
  ): Pick<PerformanceSample, 'cpuApp' | 'cpuSystem'> {
    const result: Pick<PerformanceSample, 'cpuApp' | 'cpuSystem'> = { cpuApp: null, cpuSystem: null };
    if (!cpu || process === null) return result;
    if (this.cpu) {
      const total = cpu.total - this.cpu.value.total;
      const idle = cpu.idle - this.cpu.value.idle;
      const used = process - this.cpu.value.process;
      if (total > 0) {
        result.cpuApp = round(clamp((used / total) * 100, 0, 100));
        result.cpuSystem = round(clamp(((total - idle) / total) * 100, 0, 100));
      }
    }
    this.cpu = { value: { total: cpu.total, idle: cpu.idle, process }, at: Date.now() };
    return result;
  }

  private frameRate(
    frames: { frames: number; janky: number } | null,
    now: number,
  ): Pick<PerformanceSample, 'fps' | 'janky'> {
    const result: Pick<PerformanceSample, 'fps' | 'janky'> = { fps: null, janky: null };
    if (!frames) return result;
    if (this.frames) {
      const seconds = (now - this.frames.at) / 1000;
      const delta = frames.frames - this.frames.value.frames;
      if (seconds > 0 && delta >= 0) result.fps = round(clamp(delta / seconds, 0, 240));
    }
    this.frames = { value: { frames: frames.frames }, at: now };
    result.janky = frames.janky;
    return result;
  }

  private networkRate(
    network: { rx: number; tx: number } | null,
    now: number,
  ): Pick<PerformanceSample, 'rxKbps' | 'txKbps'> {
    const result: Pick<PerformanceSample, 'rxKbps' | 'txKbps'> = { rxKbps: null, txKbps: null };
    if (!network) return result;
    if (this.net) {
      const seconds = (now - this.net.at) / 1000;
      if (seconds > 0) {
        result.rxKbps = round(Math.max(0, (network.rx - this.net.value.rx) / 1024 / seconds), 1);
        result.txKbps = round(Math.max(0, (network.tx - this.net.value.tx) / 1024 / seconds), 1);
      }
    }
    this.net = { value: network, at: now };
    return result;
  }
}
