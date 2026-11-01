import { useT } from '@/lib/i18n';
import { CheckField, FieldGroup, NumberField, SelectField } from './MirrorFieldControls';
import { KEYBOARD_MODE_OPTIONS, MOUSE_MODE_OPTIONS } from './mirrorOptions';
import type { MirrorDraft } from './mirrorDraft';

interface MirrorDevicePanelProps {
  draft: MirrorDraft;
  patch: (value: Partial<MirrorDraft>) => void;
}

export function MirrorDevicePanel({ draft, patch }: MirrorDevicePanelProps) {
  const t = useT();
  const display = draft.videoSource === 'display';

  return (
    <div className="grid gap-3">
      <FieldGroup title={t('mirror.device.inputGroup')}>
        <SelectField
          label={t('mirror.device.keyboard')}
          hint={t('mirror.device.keyboardHint')}
          value={draft.keyboardMode}
          options={KEYBOARD_MODE_OPTIONS}
          onChange={keyboardMode => patch({ keyboardMode })}
        />
        <SelectField
          label={t('mirror.device.mouse')}
          hint={t('mirror.device.mouseHint')}
          value={draft.mouseMode}
          options={MOUSE_MODE_OPTIONS}
          onChange={mouseMode => patch({ mouseMode })}
        />
        <CheckField
          label={t('mirror.device.clipboardSync')}
          hint={t('mirror.device.clipboardSyncHint')}
          checked={draft.clipboardSync}
          onChange={clipboardSync => patch({ clipboardSync })}
        />
      </FieldGroup>

      <FieldGroup title={t('mirror.device.displayGroup')}>
        <CheckField
          label={t('mirror.device.showTouches')}
          checked={draft.showTouches}
          onChange={showTouches => patch({ showTouches })}
        />
        <CheckField
          label={t('mirror.device.stayAwake')}
          checked={draft.stayAwake}
          onChange={stayAwake => patch({ stayAwake })}
        />
      </FieldGroup>

      <FieldGroup title={t('mirror.device.powerGroup')}>
        <CheckField
          label={t('mirror.device.startScreenOff')}
          hint={t('mirror.device.startScreenOffHint')}
          checked={draft.startScreenOff}
          disabled={!display}
          onChange={startScreenOff => patch({ startScreenOff })}
        />
        <CheckField
          label={t('mirror.device.powerOffOnClose')}
          hint={t(display ? 'mirror.device.powerOffHintDisplay' : 'mirror.device.powerOffHintCamera')}
          checked={draft.powerOffOnClose}
          disabled={!display}
          onChange={powerOffOnClose => patch({ powerOffOnClose })}
        />
        <NumberField
          label={t('mirror.device.screenOffTimeout')}
          hint={t('mirror.device.screenOffTimeoutHint')}
          value={draft.screenOffSeconds}
          min={0}
          max={86_400}
          onChange={screenOffSeconds => patch({ screenOffSeconds })}
        />
      </FieldGroup>
    </div>
  );
}
