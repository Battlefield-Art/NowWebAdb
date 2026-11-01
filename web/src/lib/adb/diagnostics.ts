import { BugReport } from '@yume-chan/android-bin';
import type { Adb } from '@yume-chan/adb';
import { timestampForFilename } from '@/lib/utils/download';
import { readBytes } from './async';

export interface BugReportState {
  version: string | undefined;
  flat: boolean;
  zipped: boolean;
  progress: boolean;
  stream: boolean;
}

export type BugReportMethod = 'stream' | 'file' | 'flat';

export function bugReportMethod(state: BugReportState): BugReportMethod {
  if (state.stream) return 'stream';
  if (state.zipped) return 'file';
  return 'flat';
}

export async function readBugReportState(adb: Adb): Promise<BugReportState> {
  const report = await BugReport.queryCapabilities(adb);
  return {
    version: report.bugReportZVersion,
    flat: report.supportsBugReport,
    zipped: report.supportsBugReportZ,
    progress: report.supportsBugReportZProgress,
    stream: report.supportsBugReportZStream,
  };
}

const MAX_BUG_REPORT_BYTES = 256 * 1024 * 1024;

export interface BugReportDownloadOptions {
  signal?: AbortSignal;
  maxBytes?: number;
  onProgress?: (completed: string, total: string) => void;
}

export interface BugReportDownload {
  blob: Blob;
  filename: string;
  zipped: boolean;
  bytes: number;
}

export async function downloadBugReport(
  adb: Adb,
  options: BugReportDownloadOptions = {},
): Promise<BugReportDownload> {
  const report = await BugReport.queryCapabilities(adb);
  const { type, stream } = report.automatic(options.onProgress);
  const data = await readBytes(stream, options.maxBytes ?? MAX_BUG_REPORT_BYTES, options.signal);
  const zipped = type === 'bugreportz';
  return {
    blob: new Blob([new Uint8Array(data)], { type: zipped ? 'application/zip' : 'text/plain' }),
    filename: `bugreport-${timestampForFilename()}.${zipped ? 'zip' : 'txt'}`,
    zipped,
    bytes: data.byteLength,
  };
}
