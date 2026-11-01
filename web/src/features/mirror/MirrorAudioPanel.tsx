import { useT } from '@/lib/i18n';
import { CheckField, FieldGroup, NumberField, SelectField } from './MirrorFieldControls';
import type { MirrorDraft } from './mirrorDraft';
import { AUDIO_CODEC_OPTIONS, AUDIO_SOURCE_OPTIONS } from './mirrorOptions';

interface MirrorAudioPanelProps {
  draft: MirrorDraft;
  patch: (value: Partial<MirrorDraft>) => void;
}

export function MirrorAudioPanel({ draft, patch }: MirrorAudioPanelProps) {
  const t = useT();
  const camera = draft.videoSource === 'camera';
  const sources = AUDIO_SOURCE_OPTIONS.map(option =>
    option.value === 'output' && camera ? { ...option, disabled: true } : option,
  );

  const toggleAudio = (audio: boolean) => {
    const forcedMic = audio && camera && !draft.audioDup && draft.audioSource === 'output';
    patch(forcedMic ? { audio, audioSource: 'mic' } : { audio });
  };

  return (
    <div className="grid gap-3">
      <CheckField
        label={t('mirror.audio.forward')}
        hint={t('mirror.audio.forwardHint')}
        checked={draft.audio}
        onChange={toggleAudio}
      />

      {draft.audio ? (
        <FieldGroup title={t('mirror.audio.group')}>
          <SelectField
            label={t('mirror.audio.source')}
            value={draft.audioSource}
            options={sources}
            onChange={audioSource => patch({ audioSource })}
          />
          {camera ? (
            <p className="text-[10.5px] leading-relaxed text-muted-2">
              {t('mirror.audio.cameraMicOnly')}
            </p>
          ) : null}
          <SelectField
            label={t('mirror.audio.codec')}
            value={draft.audioCodec}
            options={AUDIO_CODEC_OPTIONS}
            hint={draft.audioCodec === 'raw' ? t('mirror.audio.rawHint') : undefined}
            onChange={audioCodec => patch({ audioCodec })}
          />
          <NumberField
            label={t('mirror.audio.bitrate')}
            value={draft.audioBitrate}
            min={8}
            max={512}
            onChange={audioBitrate => patch({ audioBitrate })}
          />
          <CheckField
            label={t('mirror.audio.dup')}
            hint={t('mirror.audio.dupHint')}
            checked={draft.audioDup}
            onChange={audioDup => patch({ audioDup })}
          />
        </FieldGroup>
      ) : null}
    </div>
  );
}
