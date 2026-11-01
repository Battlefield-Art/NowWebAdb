import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Adb } from '@yume-chan/adb';
import { t } from '@/lib/i18n';
import type { ScrcpySettings } from '@/lib/adb/scrcpySettings';
import { saveToDisk, timestampForFilename } from '@/lib/utils/download';
import { toErrorMessage } from '@/lib/utils/format';
import { resolveKeyCode } from './scrcpyInput';
import { ScrcpySession, type SessionStatus } from './scrcpySession';
import type { VideoContent } from './videoPadding';

export interface MirrorSession {
  status: SessionStatus | 'idle';
  error: string;
  controlError: string;
  width: number;
  height: number;
  content: VideoContent | undefined;
  audioStatus: string;
  deviceClipboard: string;
  ready: boolean;
  controllable: boolean;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  sessionRef: RefObject<ScrcpySession | null>;
  restart: () => void;
  stop: () => void;
  pressKey: (key: string | number) => void;
  sendClipboard: (text: string) => Promise<boolean>;
  rotate: () => void;
  expandNotifications: () => void;
  setScreenPower: (on: boolean) => void;
  screenshot: () => Promise<void>;
  resumeAudio: () => Promise<void>;
}

export function useScrcpySession(adb: Adb | null, settings: ScrcpySettings): MirrorSession {
  const [status, setStatus] = useState<SessionStatus | 'idle'>('idle');
  const [error, setError] = useState('');
  const [controlError, setControlError] = useState('');
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [content, setContent] = useState<VideoContent>();
  const [audioStatus, setAudioStatus] = useState(() => t('mirror.session.audioOff'));
  const [deviceClipboard, setDeviceClipboard] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionRef = useRef<ScrcpySession | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!adb || !canvas || !enabled) return;
    let active = true;
    let session: ScrcpySession | undefined;
    void (async () => {
      setStatus('connecting');
      setError('');
      setControlError('');
      setWidth(0);
      setHeight(0);
      setContent(undefined);
      setDeviceClipboard('');
      setAudioStatus(settings.audio ? t('mirror.session.waitingAudio') : t('mirror.session.audioOff'));
      session = new ScrcpySession(adb, settings, {
        onStatus: (next, message) => {
          if (!active) return;
          setStatus(next);
          setError(message ?? '');
        },
        onSize: (nextWidth, nextHeight) => {
          if (!active) return;
          setWidth(nextWidth);
          setHeight(nextHeight);
        },
        onContent: next => {
          if (active) setContent(next);
        },
        onAudio: text => {
          if (active) setAudioStatus(text);
        },
        onClipboard: text => {
          if (active) setDeviceClipboard(text);
        },
        onControlError: text => {
          if (active) setControlError(text);
        },
      });
      sessionRef.current = session;
      await session.start(canvas);
    })();
    return () => {
      active = false;
      if (sessionRef.current === session) sessionRef.current = null;
      void session?.dispose();
    };
  }, [adb, settings, enabled, attempt]);

  const restart = useCallback(() => {
    setEnabled(true);
    setAttempt(value => value + 1);
  }, []);

  const stop = useCallback(() => {
    setEnabled(false);
    setStatus('idle');
    setError('');
    setControlError('');
    const session = sessionRef.current;
    sessionRef.current = null;
    void session?.dispose();
  }, []);

  const pressKey = useCallback((key: string | number) => {
    const keyCode = resolveKeyCode(key);
    if (keyCode !== undefined) void sessionRef.current?.pressKey(keyCode);
  }, []);

  const sendClipboard = useCallback(async (text: string) => {
    const session = sessionRef.current;
    if (!session) return false;
    return session.setClipboard(text);
  }, []);

  const rotate = useCallback(() => {
    void sessionRef.current?.rotate();
  }, []);

  const expandNotifications = useCallback(() => {
    void sessionRef.current?.expandNotifications();
  }, []);

  const setScreenPower = useCallback((on: boolean) => {
    void sessionRef.current?.setScreenPower(on);
  }, []);

  const screenshot = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    try {
      const blob = await session.screenshot();
      saveToDisk(blob, `nowwebadb-mirror-${timestampForFilename()}.png`);
    } catch (cause) {
      setControlError(t('mirror.session.screenshotFailed', { error: toErrorMessage(cause) }));
    }
  }, []);

  const resumeAudio = useCallback(async () => {
    try {
      await sessionRef.current?.resumeAudio();
    } catch (cause) {
      setAudioStatus(t('mirror.session.audioUnavailable', { error: toErrorMessage(cause) }));
    }
  }, []);

  return {
    status,
    error,
    controlError,
    width,
    height,
    content,
    audioStatus,
    deviceClipboard,
    ready: status === 'connected',
    controllable: status === 'connected' && settings.videoSource === 'display',
    canvasRef,
    sessionRef,
    restart,
    stop,
    pressKey,
    sendClipboard,
    rotate,
    expandNotifications,
    setScreenPower,
    screenshot,
    resumeAudio,
  };
}
