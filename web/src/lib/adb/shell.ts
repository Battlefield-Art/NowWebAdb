import type { Adb } from '@yume-chan/adb';
import type { MaybeConsumable, ReadableStream, WritableStream } from '@yume-chan/stream-extra';
import { t } from '@/lib/i18n';
import { readBytes, readText, throwIfAborted, withTimeout } from './async';
import type { BinaryOptions, ExecResult, ShellOptions } from './types';

export type CommandInput = string | readonly string[];

const EXIT_MARKER = '__NOWWEBADB_EXIT_';
const FAILURE_PATTERN =
  /(?:^|\n)\s*(?:Failure\b|Error\b|Exception\b|SecurityException\b|java\.[\w.]+Exception\b)|permission denied|not allowed|No activities found|monkey aborted/i;

export function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function toCommand(input: CommandInput): string {
  return typeof input === 'string' ? input : input.map(shellEscape).join(' ');
}

function commandWithMarker(command: string): string {
  return `${command}; __nowwebadb_status=$?; printf '\\n${EXIT_MARKER}%s\\n' "$__nowwebadb_status"`;
}

function stripMarker(output: string): { text: string; exitCode: number } {
  const match = new RegExp(`\\n${EXIT_MARKER}(\\d+)\\s*$`).exec(output);
  if (!match) return { text: output.trim(), exitCode: 0 };
  return {
    text: output.replace(/\n__NOWWEBADB_EXIT_\d+\s*$/, '').trim(),
    exitCode: Number(match[1] ?? 0),
  };
}

async function execWithoutShellProtocol(
  adb: Adb,
  command: string,
  { signal, timeout = 20000 }: ShellOptions,
): Promise<ExecResult> {
  const process = await withTimeout(adb.subprocess.noneProtocol.spawn(commandWithMarker(command), signal), timeout, signal);
  try {
    const [output] = await withTimeout(Promise.all([readText(process.output), process.exited]), timeout, signal);
    const { text, exitCode } = stripMarker(output);
    return { stdout: text, stderr: '', exitCode };
  } finally {
    try {
      await process.kill();
    } catch {
      /* already exited */
    }
  }
}

export async function exec(adb: Adb, input: CommandInput, options: ShellOptions = {}): Promise<ExecResult> {
  const { signal, timeout = 20000 } = options;
  throwIfAborted(signal);
  const command = toCommand(input);
  const shell = adb.subprocess.shellProtocol;
  if (shell?.isSupported) {
    const result = await withTimeout(shell.spawnWaitText(command), timeout, signal);
    return { stdout: result.stdout.trim(), stderr: result.stderr, exitCode: result.exitCode };
  }
  return execWithoutShellProtocol(adb, command, options);
}

export async function execText(adb: Adb, input: CommandInput, options?: ShellOptions): Promise<string> {
  const result = await exec(adb, input, options);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || result.stdout || t('terminal.error.commandFailed'));
  }
  return result.stdout;
}

export async function runAppCommand(
  adb: Adb,
  input: CommandInput,
  options: ShellOptions = {},
): Promise<string> {
  const result = await exec(adb, input, options);
  if (result.exitCode !== 0 || FAILURE_PATTERN.test(`${result.stdout}\n${result.stderr}`)) {
    throw new Error(result.stdout || result.stderr || t('terminal.error.commandFailed'));
  }
  return result.stdout;
}

async function readBinary(adb: Adb, command: string, options: BinaryOptions): Promise<Uint8Array> {
  const { signal, timeout = 30000, maxBytes = 32 * 1024 * 1024 } = options;
  throwIfAborted(signal);
  const process = await withTimeout(adb.subprocess.noneProtocol.spawn(command, signal), timeout, signal);
  try {
    const bytes = await withTimeout(readBytes(process.output, maxBytes, signal), timeout, signal);
    const exit = await withTimeout(Promise.resolve(process.exited), timeout, signal);
    void exit;
    return bytes;
  } finally {
    try {
      await process.kill();
    } catch {
      /* already exited */
    }
  }
}

export async function execBytes(adb: Adb, command: string, options: BinaryOptions = {}): Promise<Uint8Array> {
  return readBinary(adb, command, options);
}

const READ_BLOCK = 64 * 1024;

export async function readRange(
  adb: Adb,
  path: string,
  start: number,
  length: number,
  { signal, timeout = 30000, maxBytes = 64 * 1024 * 1024 }: BinaryOptions = {},
): Promise<Uint8Array> {
  if (!Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(length) || length <= 0) {
    throw new Error(t('terminal.error.invalidRange'));
  }
  if (length > maxBytes) throw new Error(t('terminal.error.readTooLarge'));
  const alignedStart = Math.floor(start / READ_BLOCK) * READ_BLOCK;
  const blocks = Math.ceil((start + length - alignedStart) / READ_BLOCK);
  const command = `dd if=${shellEscape(path)} bs=${READ_BLOCK} skip=${alignedStart / READ_BLOCK} count=${blocks} 2>/dev/null`;
  const bytes = await readBinary(adb, command, { signal, timeout, maxBytes: (blocks + 1) * READ_BLOCK });
  const offset = start - alignedStart;
  if (bytes.length < offset + length) throw new Error(t('terminal.error.readIncomplete'));
  return bytes.subarray(offset, offset + length);
}

export async function readTail(
  adb: Adb,
  path: string,
  length = 128 * 1024,
  options: BinaryOptions = {},
): Promise<Uint8Array> {
  const command = `tail -c ${Math.max(1, length)} ${shellEscape(path)} 2>/dev/null`;
  return readBinary(adb, command, { ...options, maxBytes: length + 4096 });
}

export interface ShellProcess {
  stdin: WritableStream<MaybeConsumable<Uint8Array>>;
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array> | undefined;
  exited: Promise<number>;
  kill: () => Promise<void>;
}

export async function spawn(adb: Adb, input: CommandInput, options: ShellOptions = {}): Promise<ShellProcess> {
  const { signal, timeout = 20000 } = options;
  throwIfAborted(signal);
  const command = toCommand(input);
  const shell = adb.subprocess.shellProtocol;
  if (shell?.isSupported) {
    const process = await withTimeout(shell.spawn(command, signal), timeout, signal);
    return {
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
      exited: process.exited,
      kill: async () => {
        await process.kill();
      },
    };
  }
  const process = await withTimeout(adb.subprocess.noneProtocol.spawn(command, signal), timeout, signal);
  return {
    stdin: process.stdin,
    stdout: process.output,
    stderr: undefined,
    exited: process.exited.then(() => 0),
    kill: async () => {
      await process.kill();
    },
  };
}

export interface PtyProcess {
  input: WritableStream<MaybeConsumable<Uint8Array>>;
  output: ReadableStream<Uint8Array>;
  exited: Promise<number>;
  resize: (rows: number, cols: number) => Promise<void>;
  sigint: () => Promise<void>;
  kill: () => Promise<void>;
}

export interface PtyOptions {
  command?: string | readonly string[];
  terminalType?: string;
}

export async function openPty(adb: Adb, options: PtyOptions = {}): Promise<PtyProcess> {
  const shell = adb.subprocess.shellProtocol;
  if (shell?.isSupported) {
    const pty = await shell.pty({ command: options.command, terminalType: options.terminalType ?? 'xterm-256color' });
    return {
      input: pty.input,
      output: pty.output,
      exited: pty.exited,
      resize: (rows, cols) => pty.resize(rows, cols),
      sigint: () => pty.sigint(),
      kill: async () => {
        await pty.kill();
      },
    };
  }
  const pty = await adb.subprocess.noneProtocol.pty(options.command);
  return {
    input: pty.input,
    output: pty.output,
    exited: pty.exited.then(() => 0),
    resize: async () => {},
    sigint: () => pty.sigint(),
    kill: async () => {
      await pty.kill();
    },
  };
}
