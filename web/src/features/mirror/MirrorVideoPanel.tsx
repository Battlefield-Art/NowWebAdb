import type { Adb } from '@yume-chan/adb';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import type { ScrcpyAudioSource, ScrcpyVideoSource } from '@/lib/adb/scrcpySettings';
import { MirrorCameraPanel } from './MirrorCameraPanel';
import { CheckField, FieldGroup, NumberField, SelectField, TextField } from './MirrorFieldControls';
import { MirrorSourceFields } from './MirrorSourceFields';
import type { MirrorDraft } from './mirrorDraft';
import {
  CAPTURE_ORIENTATION_OPTIONS,
  draftOptionLabel,
  VIDEO_CODEC_OPTIONS,
  VIDEO_SOURCE_OPTIONS,
} from './mirrorOptions';

interface MirrorVideoPanelProps {
  adb: Adb | null;
  draft: MirrorDraft;
  patch: (value: Partial<MirrorDraft>) => void;
  onPickCrop?: () => void;
}

function SourceToggle({ value, onChange }: {
  value: ScrcpyVideoSource;
  onChange: (value: ScrcpyVideoSource) => void;
}) {
  const t = useT();
  return (
    <div
      role="group"
      aria-label={t('mirror.video.sourceAria')}
      className="grid grid-cols-2 gap-0.5 rounded-[8px] border border-line bg-surface-2 p-0.5"
    >
      {VIDEO_SOURCE_OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          className={cn(
            'h-7 rounded-[6px] text-[11.5px] font-semibold transition-colors',
            value === option.value
              ? 'bg-surface text-ink shadow-card'
              : 'text-muted hover:text-ink',
          )}
          onClick={() => onChange(option.value)}
        >
          {draftOptionLabel(option, t)}
        </button>
      ))}
    </div>
  );
}

function VirtualDisplayFields({ draft, patch }: {
  draft: MirrorDraft;
  patch: (value: Partial<MirrorDraft>) => void;
}) {
  const t = useT();
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label={t('mirror.video.virtualWidth')}
          hint={t('mirror.option.autoZero')}
          value={draft.virtualDisplayWidth}
          min={0}
          max={8192}
          disabled={!draft.virtualDisplay}
          onChange={virtualDisplayWidth => patch({ virtualDisplayWidth })}
        />
        <NumberField
          label={t('mirror.video.virtualHeight')}
          value={draft.virtualDisplayHeight}
          min={0}
          max={8192}
          disabled={!draft.virtualDisplay}
          onChange={virtualDisplayHeight => patch({ virtualDisplayHeight })}
        />
      </div>
      <NumberField
        label={t('mirror.video.virtualDpi')}
        hint={t('mirror.option.autoZero')}
        value={draft.virtualDisplayDpi}
        min={0}
        max={640}
        disabled={!draft.virtualDisplay}
        onChange={virtualDisplayDpi => patch({ virtualDisplayDpi })}
      />
    </>
  );
}

export function MirrorVideoPanel({ adb, draft, patch, onPickCrop }: MirrorVideoPanelProps) {
  const t = useT();
  const switchSource = (videoSource: ScrcpyVideoSource) => {
    const audioSource: ScrcpyAudioSource | undefined = videoSource === 'camera'
      && draft.audio
      && !draft.audioDup
      && draft.audioSource === 'output'
      ? 'mic'
      : undefined;
    patch(audioSource ? { videoSource, audioSource } : { videoSource });
  };

  return (
    <div className="grid gap-3">
      <SourceToggle value={draft.videoSource} onChange={switchSource} />

      <FieldGroup title={t('mirror.video.groupQuality')}>
        <NumberField
          label={t('mirror.video.bitrate')}
          value={draft.bitrate}
          min={0.1}
          max={100}
          step={0.1}
          onChange={bitrate => patch({ bitrate })}
        />
        <SelectField
          label={t('mirror.video.codec')}
          value={draft.codec}
          options={VIDEO_CODEC_OPTIONS}
          onChange={codec => patch({ codec })}
        />
      </FieldGroup>

      {draft.videoSource === 'display' ? (
        <>
          <FieldGroup title={t('mirror.video.groupScreen')}>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label={t('mirror.video.maxSize')}
                hint={t('mirror.video.maxSizeHint')}
                value={draft.maxSize}
                min={0}
                max={8192}
                onChange={maxSize => patch({ maxSize })}
              />
              <NumberField
                label={t('mirror.video.maxFps')}
                value={draft.maxFps}
                min={1}
                max={240}
                onChange={maxFps => patch({ maxFps })}
              />
            </div>
            <CheckField
              label={t('mirror.video.virtualDisplay')}
              hint={t('mirror.video.virtualDisplayHint')}
              checked={draft.virtualDisplay}
              onChange={virtualDisplay => patch({ virtualDisplay })}
            />
            <VirtualDisplayFields draft={draft} patch={patch} />
            {draft.virtualDisplay ? null : (
              <MirrorSourceFields
                adb={adb}
                codec={draft.codec}
                displayId={draft.displayId}
                encoder={draft.encoder}
                onDisplayIdChange={displayId => patch({ displayId })}
                onEncoderChange={encoder => patch({ encoder })}
              />
            )}
          </FieldGroup>

          <FieldGroup
            title={t('mirror.video.groupCrop')}
            action={onPickCrop ? (
              <button
                type="button"
                className="text-[10.5px] font-semibold text-accent hover:underline"
                onClick={onPickCrop}
              >
                {t('mirror.video.pickCrop')}
              </button>
            ) : null}
          >
            <TextField
              label={t('mirror.video.crop')}
              value={draft.crop}
              placeholder={t('mirror.video.cropPlaceholder')}
              hint={t('mirror.video.cropHint')}
              mono
              onChange={crop => patch({ crop })}
            />
            <SelectField
              label={t('mirror.video.captureOrientation')}
              value={draft.captureOrientation}
              options={CAPTURE_ORIENTATION_OPTIONS}
              onChange={captureOrientation => patch({ captureOrientation })}
            />
          </FieldGroup>

          <FieldGroup title={t('mirror.video.groupStartApp')}>
            <TextField
              label={t('mirror.video.startApp')}
              value={draft.startApp}
              placeholder="com.example.app"
              hint={t('mirror.video.startAppHint')}
              mono
              onChange={startApp => patch({ startApp })}
            />
          </FieldGroup>
        </>
      ) : (
        <MirrorCameraPanel adb={adb} draft={draft} patch={patch} />
      )}
    </div>
  );
}
