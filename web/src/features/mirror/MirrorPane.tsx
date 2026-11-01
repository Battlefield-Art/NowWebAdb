import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Adb } from '@yume-chan/adb';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import { toErrorMessage } from '@/lib/utils/format';
import { useT } from '@/lib/i18n';
import { selectAdb, useDeviceStore } from '@/stores/device';
import { readDisplaySize, type DisplaySize } from '@/lib/adb/display';
import type { ScrcpySettings } from '@/lib/adb/scrcpySettings';
import { MirrorStage } from './MirrorStage';
import { MirrorToolbar } from './MirrorToolbar';
import { loadScrcpySettings, saveScrcpySettings } from './scrcpySettings';
import { useMirrorInput } from './useMirrorInput';
import { useMirrorRecording } from './useMirrorRecording';
import { usePictureInPicture } from './usePictureInPicture';
import { useScrcpySession } from './useScrcpySession';
import type { VideoContent } from './videoPadding';

const DEFAULT_RATIO = '9 / 16';
const DESKTOP_QUERY = '(min-width: 1024px)';
const subscribeDesktop = (onChange: () => void) => {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const desktopSnapshot = () => window.matchMedia(DESKTOP_QUERY).matches;

function resolveCropTarget(
  settings: ScrcpySettings,
  displaySize: DisplaySize | undefined,
  content: VideoContent | undefined,
  size: { width: number; height: number },
): { width: number; height: number } {
  if (settings.virtualDisplay && settings.virtualDisplayWidth > 0 && settings.virtualDisplayHeight > 0) {
    return { width: settings.virtualDisplayWidth, height: settings.virtualDisplayHeight };
  }
  return displaySize ?? { width: content?.width ?? size.width, height: content?.height ?? size.height };
}

function resolveRatio(content: VideoContent | undefined, width: number, height: number): string {
  if (content) return `${content.width} / ${content.height}`;
  return width > 0 && height > 0 ? `${width} / ${height}` : DEFAULT_RATIO;
}

function ControlError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex flex-none items-start gap-1.5 rounded-[7px] border border-danger/30 bg-danger-soft px-2.5 py-1.5 text-[11.5px] leading-relaxed text-danger"
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      {message}
    </p>
  );
}

export function MirrorPane() {
  const t = useT();
  const adb = useDeviceStore(selectAdb);
  const desktop = useSyncExternalStore(subscribeDesktop, desktopSnapshot);
  const [settings, setSettings] = useState<ScrcpySettings>(loadScrcpySettings);
  const [showNavKeys, setShowNavKeys] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [cropPicking, setCropPicking] = useState(false);
  const [display, setDisplay] = useState<{ adb: Adb; size: DisplaySize }>();
  const rootRef = useRef<HTMLElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const session = useScrcpySession(adb, settings);
  const { restart } = session;
  const recording = useMirrorRecording(
    session.canvasRef,
    session.sessionRef,
    settings.maxFps,
    settings.videoBitRate,
    session.ready,
  );
  const pip = usePictureInPicture(pipVideoRef, session.canvasRef, settings.maxFps, session.ready);
  const displaySize = display && display.adb === adb ? display.size : undefined;
  const fill = desktop && !fullscreen;
  const input = useMirrorInput(
    session.sessionRef,
    session.ready && session.controllable,
    session.width,
    session.height,
    session.content,
    fill,
    settings.keyboardMode,
    settings.mouseMode,
  );

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!adb) return;
    let active = true;
    void readDisplaySize(adb)
      .then(size => {
        if (active) setDisplay({ adb, size });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [adb]);

  const toggleFullscreen = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const action = document.fullscreenElement === root
      ? document.exitFullscreen()
      : root.requestFullscreen();
    void action.catch(cause => toast.error(t('mirror.pane.fullscreenError', { error: toErrorMessage(cause) })));
  }, [t]);

  const applySettings = useCallback((next: ScrcpySettings) => {
    saveScrcpySettings(next);
    setSettings(next);
    restart();
  }, [restart]);

  const applyCrop = useCallback((crop: string) => {
    setCropPicking(false);
    applySettings({ ...settings, crop });
    toast.success(t('mirror.pane.cropApplied', { crop }));
  }, [applySettings, settings, t]);

  const cropTarget = resolveCropTarget(settings, displaySize, session.content, {
    width: session.width,
    height: session.height,
  });

  const content = session.content;
  const ratio = resolveRatio(content, session.width, session.height);

  return (
    <aside
      ref={rootRef}
      aria-label={t('mirror.pane.aria')}
      className={cn(
        'flex min-h-0 shrink-0',
        fullscreen
          ? 'h-dvh w-screen flex-row gap-2 bg-paper p-3'
          : 'flex-col gap-2 max-lg:h-[min(58dvh,560px)] max-lg:w-full lg:h-full lg:w-auto lg:flex-row',
      )}
    >
      <video
        ref={pipVideoRef}
        muted
        playsInline
        autoPlay
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 size-px opacity-0"
      />
      <div
        style={{ '--mirror-ratio': ratio } as CSSProperties}
        className={cn(
          'flex min-h-0 min-w-0 flex-col gap-2',
          fullscreen
            ? 'flex-1'
            : 'max-lg:flex-1 lg:h-full lg:flex-none lg:shrink-0 lg:max-w-[48vw] lg:aspect-[var(--mirror-ratio)]',
        )}
      >
        <MirrorStage
          canvasRef={session.canvasRef}
          status={session.status}
          error={session.error}
          width={session.width}
          height={session.height}
          content={session.content}
          fill={fill}
          input={input}
          showNavKeys={showNavKeys && session.controllable}
          uhidMouse={settings.mouseMode === 'uhid'}
          cropPicking={cropPicking && session.ready}
          cropTarget={cropTarget}
          onCropApply={applyCrop}
          onCropCancel={() => setCropPicking(false)}
          onNavKey={session.pressKey}
        />
        {session.controlError ? <ControlError message={session.controlError} /> : null}
      </div>

      <MirrorToolbar
        adb={adb}
        status={session.status}
        ready={session.ready}
        controllable={session.controllable}
        settings={settings}
        audioStatus={session.audioStatus}
        deviceClipboard={session.deviceClipboard}
        showCoordinates={input.showCoordinates}
        keyboardEnabled={input.keyboardEnabled}
        showNavKeys={showNavKeys}
        fullscreen={fullscreen}
        recording={recording.recording}
        recordingSeconds={recording.seconds}
        pipActive={pip.active}
        onReconnect={session.restart}
        onStop={session.stop}
        onApplySettings={applySettings}
        onPickCrop={() => setCropPicking(true)}
        onScreenshot={() => void session.screenshot()}
        onToggleRecording={recording.toggle}
        onTogglePip={pip.toggle}
        onRotate={session.rotate}
        onNotifications={session.expandNotifications}
        onScreenPower={session.setScreenPower}
        onKey={session.pressKey}
        onToggleCoordinates={input.toggleCoordinates}
        onToggleKeyboard={input.toggleKeyboard}
        onToggleNavKeys={() => setShowNavKeys(value => !value)}
        onSendClipboard={session.sendClipboard}
        onResumeAudio={() => void session.resumeAudio()}
        onToggleFullscreen={toggleFullscreen}
      />
    </aside>
  );
}
