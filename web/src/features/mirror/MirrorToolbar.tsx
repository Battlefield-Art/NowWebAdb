import {
  Bell,
  Camera,
  Circle,
  Crosshair,
  Keyboard,
  Maximize,
  Minimize,
  Monitor,
  MonitorOff,
  PanelBottom,
  PictureInPicture2,
  RefreshCw,
  RotateCw,
  Square,
  Volume1,
  Volume2,
} from 'lucide-react';
import type { ScrcpySettings } from '@/lib/adb/scrcpySettings';
import type { Adb } from '@yume-chan/adb';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import { MirrorAudioPopover } from './MirrorAudioPopover';
import { MirrorClipboardPopover } from './MirrorClipboardPopover';
import { MirrorSettingsPopover } from './MirrorSettingsPopover';
import type { SessionStatus } from './scrcpySession';
import { ToolbarButton } from './ToolbarButton';

export interface MirrorToolbarProps {
  adb: Adb | null;
  status: SessionStatus | 'idle';
  ready: boolean;
  controllable: boolean;
  settings: ScrcpySettings;
  audioStatus: string;
  deviceClipboard: string;
  showCoordinates: boolean;
  keyboardEnabled: boolean;
  showNavKeys: boolean;
  fullscreen: boolean;
  recording: boolean;
  recordingSeconds: number;
  pipActive: boolean;
  onReconnect: () => void;
  onStop: () => void;
  onApplySettings: (settings: ScrcpySettings) => void;
  onPickCrop: () => void;
  onScreenshot: () => void;
  onToggleRecording: () => void;
  onTogglePip: () => void;
  onRotate: () => void;
  onNotifications: () => void;
  onScreenPower: (on: boolean) => void;
  onKey: (name: string) => void;
  onToggleCoordinates: () => void;
  onToggleKeyboard: () => void;
  onToggleNavKeys: () => void;
  onSendClipboard: (text: string) => Promise<boolean>;
  onResumeAudio: () => void;
  onToggleFullscreen: () => void;
}

function Divider() {
  return <span aria-hidden className="h-5 w-px bg-line-soft lg:h-px lg:w-5" />;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function RecordButton({ recording, seconds, disabled, onClick }: {
  recording: boolean;
  seconds: number;
  disabled: boolean;
  onClick: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      aria-pressed={recording}
      aria-label={recording ? t('mirror.toolbar.stopRecording') : t('mirror.toolbar.record')}
      title={recording
        ? t('mirror.toolbar.stopRecordingDuration', { time: formatDuration(seconds) })
        : t('mirror.toolbar.record')}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-8 shrink-0 items-center justify-center gap-1 rounded-[7px] text-muted transition-colors',
        'hover:bg-surface-3 hover:text-ink disabled:pointer-events-none disabled:opacity-40',
        recording ? 'w-auto px-1.5 text-danger aria-pressed:bg-danger-soft' : 'w-8',
      )}
    >
      <Circle className={cn('size-[11px]', recording && 'animate-pulse fill-danger text-danger')} strokeWidth={2.4} />
      {recording ? <span className="mono text-[10px] leading-none">{formatDuration(seconds)}</span> : null}
    </button>
  );
}

export function MirrorToolbar(props: MirrorToolbarProps) {
  const t = useT();
  const { status, ready, controllable } = props;
  return (
    <aside
      aria-label={t('mirror.toolbar.aria')}
      className="flex shrink-0 flex-wrap items-center justify-center gap-0.5 rounded-[12px] border border-line bg-surface p-1 shadow-card lg:max-h-full lg:w-11 lg:flex-col lg:flex-nowrap lg:self-center lg:overflow-y-auto lg:py-1.5"
    >
      <ToolbarButton
        title={t('mirror.toolbar.reconnect')}
        aria-label={t('mirror.toolbar.reconnect')}
        disabled={status === 'connecting'}
        onClick={props.onReconnect}
      >
        <RefreshCw className="size-[18px]" />
      </ToolbarButton>
      <ToolbarButton
        title={t('mirror.toolbar.stop')}
        aria-label={t('mirror.toolbar.stop')}
        disabled={status === 'idle'}
        onClick={props.onStop}
      >
        <Square className="size-[17px]" />
      </ToolbarButton>

      <Divider />

      <MirrorSettingsPopover
        adb={props.adb}
        settings={props.settings}
        onApply={props.onApplySettings}
        onPickCrop={props.onPickCrop}
      />
      <ToolbarButton
        title={t('mirror.toolbar.screenshot')}
        aria-label={t('mirror.toolbar.screenshot')}
        disabled={!ready}
        onClick={props.onScreenshot}
      >
        <Camera className="size-[18px]" />
      </ToolbarButton>
      <RecordButton
        recording={props.recording}
        seconds={props.recordingSeconds}
        disabled={!ready}
        onClick={props.onToggleRecording}
      />
      <ToolbarButton
        active={props.pipActive}
        title={t('mirror.toolbar.pip')}
        aria-label={t('mirror.toolbar.pip')}
        disabled={!ready}
        onClick={props.onTogglePip}
      >
        <PictureInPicture2 className="size-[18px]" />
      </ToolbarButton>
      <ToolbarButton
        title={t('mirror.toolbar.rotate')}
        aria-label={t('mirror.toolbar.rotate')}
        disabled={!controllable}
        onClick={props.onRotate}
      >
        <RotateCw className="size-[18px]" />
      </ToolbarButton>
      <ToolbarButton
        title={t('mirror.toolbar.notifications')}
        aria-label={t('mirror.toolbar.notifications')}
        disabled={!controllable}
        onClick={props.onNotifications}
      >
        <Bell className="size-[18px]" />
      </ToolbarButton>
      <ToolbarButton
        title={t('mirror.toolbar.screenOff')}
        aria-label={t('mirror.toolbar.screenOff')}
        disabled={!controllable}
        onClick={() => props.onScreenPower(false)}
      >
        <MonitorOff className="size-[18px]" />
      </ToolbarButton>
      <ToolbarButton
        title={t('mirror.toolbar.screenOn')}
        aria-label={t('mirror.toolbar.screenOn')}
        disabled={!controllable}
        onClick={() => props.onScreenPower(true)}
      >
        <Monitor className="size-[18px]" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        active={props.showCoordinates}
        title={t('mirror.toolbar.coordinates')}
        aria-label={t('mirror.toolbar.coordinates')}
        disabled={!ready}
        onClick={props.onToggleCoordinates}
      >
        <Crosshair className="size-[18px]" />
      </ToolbarButton>
      <ToolbarButton
        active={props.keyboardEnabled}
        title={t('mirror.toolbar.keyboard')}
        aria-label={t('mirror.toolbar.keyboard')}
        disabled={!controllable}
        onClick={props.onToggleKeyboard}
      >
        <Keyboard className="size-[18px]" />
      </ToolbarButton>
      <ToolbarButton
        title={t('mirror.toolbar.volumeDown')}
        aria-label={t('mirror.toolbar.volumeDownLabel')}
        disabled={!controllable}
        onClick={() => props.onKey('VolumeDown')}
      >
        <Volume1 className="size-[18px]" />
      </ToolbarButton>
      <ToolbarButton
        title={t('mirror.toolbar.volumeUp')}
        aria-label={t('mirror.toolbar.volumeUpLabel')}
        disabled={!controllable}
        onClick={() => props.onKey('VolumeUp')}
      >
        <Volume2 className="size-[18px]" />
      </ToolbarButton>
      <ToolbarButton
        active={props.showNavKeys}
        title={t('mirror.toolbar.navKeys')}
        aria-label={t('mirror.toolbar.navKeys')}
        disabled={!controllable}
        onClick={props.onToggleNavKeys}
      >
        <PanelBottom className="size-[18px]" />
      </ToolbarButton>

      <Divider />

      <MirrorClipboardPopover
        ready={controllable}
        deviceClipboard={props.deviceClipboard}
        onSend={props.onSendClipboard}
      />
      <MirrorAudioPopover
        enabled={props.settings.audio}
        ready={ready}
        status={props.audioStatus}
        onResume={props.onResumeAudio}
      />
      <ToolbarButton
        title={props.fullscreen ? t('mirror.toolbar.exitFullscreen') : t('mirror.toolbar.fullscreen')}
        aria-label={props.fullscreen ? t('mirror.toolbar.exitFullscreen') : t('mirror.toolbar.fullscreen')}
        onClick={props.onToggleFullscreen}
      >
        {props.fullscreen ? <Minimize className="size-[18px]" /> : <Maximize className="size-[18px]" />}
      </ToolbarButton>
    </aside>
  );
}
