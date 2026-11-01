import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';
import { saveToDisk, timestampForFilename } from '@/lib/utils/download';
import { toErrorMessage } from '@/lib/utils/format';
import type { ScrcpySession } from './scrcpySession';

const MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return MIME_CANDIDATES.find(mime => MediaRecorder.isTypeSupported(mime));
}

export interface MirrorRecording {
  recording: boolean;
  seconds: number;
  toggle: () => void;
  stop: () => void;
}

export function useMirrorRecording(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  sessionRef: RefObject<ScrcpySession | null>,
  fps: number,
  bitRate: number,
  active: boolean,
): MirrorRecording {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | undefined>(undefined);
  const startedAt = useRef(0);

  const stop = useCallback(() => {
    window.clearInterval(timerRef.current);
    timerRef.current = undefined;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    recorderRef.current = null;
    setRecording(false);
  }, []);

  const start = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || recorderRef.current) return;
    if (typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
      toast.error(t('mirror.recording.unsupported'));
      return;
    }
    const stream = canvas.captureStream(fps);
    for (const track of sessionRef.current?.audioStream?.getAudioTracks() ?? []) {
      stream.addTrack(track);
    }
    const mimeType = pickMime();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: bitRate,
      });
    } catch (cause) {
      for (const track of stream.getTracks()) track.stop();
      toast.error(t('mirror.recording.startFailed', { error: toErrorMessage(cause) }));
      return;
    }
    chunksRef.current = [];
    recorder.ondataavailable = event => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      for (const track of stream.getTracks()) track.stop();
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
      chunksRef.current = [];
      if (blob.size) saveToDisk(blob, `nowwebadb-mirror-${timestampForFilename()}.webm`);
    };
    recorder.onerror = event => {
      const message = (event as ErrorEvent).message || t('mirror.recording.unknownError');
      toast.error(t('mirror.recording.failed', { error: message }));
      stop();
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    startedAt.current = Date.now();
    setSeconds(0);
    setRecording(true);
    timerRef.current = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 500);
  }, [bitRate, canvasRef, fps, sessionRef, stop]);

  useEffect(() => {
    if (!active) return;
    return () => stop();
  }, [active, stop]);

  useEffect(() => () => {
    window.clearInterval(timerRef.current);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }, []);

  const toggle = useCallback(() => {
    if (recorderRef.current) stop();
    else start();
  }, [start, stop]);

  return { recording, seconds, toggle, stop };
}
