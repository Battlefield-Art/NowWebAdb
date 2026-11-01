type SaveFilePicker = (options?: {
  suggestedName?: string;
}) => Promise<FileSystemFileHandle>;

function picker(): SaveFilePicker | undefined {
  return (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
}

export function canSaveToFile(): boolean {
  return typeof picker() === 'function' && window.isSecureContext;
}

/**
 * Opens the browser save dialog and returns a writable target, or `null` when the
 * user cancels or the File System Access API is unavailable.
 * Must be called directly from a user gesture.
 */
export async function createSaveTarget(suggestedName: string): Promise<FileSystemWritableFileStream | null> {
  const save = picker();
  if (!save || !window.isSecureContext) return null;
  try {
    const handle = await save({ suggestedName });
    return await handle.createWritable();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    throw error;
  }
}
