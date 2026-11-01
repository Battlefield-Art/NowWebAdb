import { useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { ScanSearch } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useT, type MessageKey } from '@/lib/i18n';
import { listScrcpyCameraSizes, listScrcpyCameras, type ScrcpyCamera } from '@/lib/adb/scrcpyProbe';
import type { ScrcpyCameraFacing } from '@/lib/adb/scrcpySettings';
import { cn } from '@/lib/utils/cn';
import { toErrorMessage } from '@/lib/utils/format';
import { CheckField, FieldGroup, NumberField, SelectField, TextField } from './MirrorFieldControls';
import type { MirrorDraft } from './mirrorDraft';
import { ANGLE_OPTIONS, CAMERA_FACING_OPTIONS, type DraftOption } from './mirrorOptions';

const CHIP_CLASS =
  'inline-flex max-w-full items-center truncate rounded-full border border-line bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-muted transition-colors hover:border-accent hover:text-accent-ink';

const FACING_KEY: Record<ScrcpyCameraFacing, MessageKey> = {
  front: 'mirror.option.facingFront',
  back: 'mirror.option.facingBack',
  external: 'mirror.option.facingExternal',
};

interface MirrorCameraPanelProps {
  adb: Adb | null;
  draft: MirrorDraft;
  patch: (value: Partial<MirrorDraft>) => void;
}

export function MirrorCameraPanel({ adb, draft, patch }: MirrorCameraPanelProps) {
  const t = useT();
  const [probing, setProbing] = useState(false);
  const [cameras, setCameras] = useState<ScrcpyCamera[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [error, setError] = useState('');

  const loadSizes = async (cameraId: string) => {
    if (!adb || !cameraId) return;
    setLoadingSizes(true);
    setError('');
    try {
      setSizes(await listScrcpyCameraSizes(adb, cameraId));
    } catch (cause) {
      setError(toErrorMessage(cause));
    } finally {
      setLoadingSizes(false);
    }
  };

  const choose = (camera: ScrcpyCamera) => {
    patch({ cameraId: camera.id, cameraFacing: camera.facing ?? draft.cameraFacing });
    setSizes(camera.sizes);
    if (!camera.sizes.length && adb) void loadSizes(camera.id);
  };

  const probe = async () => {
    if (!adb || probing) return;
    setProbing(true);
    setError('');
    try {
      const list = await listScrcpyCameras(adb);
      setCameras(list);
      if (!list.length) {
        setError(t('mirror.camera.none'));
        return;
      }
      const current = list.find(camera => camera.id === draft.cameraId) ?? list[0];
      if (current) choose(current);
      toast.success(t('mirror.camera.found', { count: list.length }));
    } catch (cause) {
      setError(toErrorMessage(cause));
    } finally {
      setProbing(false);
    }
  };

  const sizeOptions: DraftOption<string>[] = [
    { value: '', labelKey: 'mirror.option.auto' },
    ...sizes.map(size => ({ value: size, label: size })),
  ];

  return (
    <div className="grid gap-3">
      <FieldGroup
        title={t('mirror.camera.group')}
        action={(
          <Button size="sm" variant="ghost" disabled={!adb || probing} onClick={() => void probe()}>
            {probing ? <Spinner className="size-3" /> : <ScanSearch />}
            {probing ? t('mirror.camera.probing') : t('mirror.camera.probe')}
          </Button>
        )}
      >
        {cameras.length ? (
          <div className="flex flex-wrap gap-1">
            {cameras.map(camera => (
              <button
                key={camera.id}
                type="button"
                title={camera.sizes.join(', ') || t('mirror.camera.sizesHint')}
                className={cn(CHIP_CLASS, draft.cameraId === camera.id && 'border-accent bg-accent-soft text-accent-ink')}
                onClick={() => choose(camera)}
              >
                #{camera.id}
                {camera.facing ? ` · ${t(FACING_KEY[camera.facing])}` : ''}
                {camera.sizes.length ? ` · ${t('mirror.camera.sizeCount', { count: camera.sizes.length })}` : ''}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-[1fr_auto] items-end gap-1.5">
          <TextField
            label={t('mirror.camera.id')}
            value={draft.cameraId}
            placeholder={t('mirror.camera.idPlaceholder')}
            mono
            onChange={cameraId => {
              patch({ cameraId });
              setSizes([]);
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            disabled={!adb || !draft.cameraId || loadingSizes}
            onClick={() => void loadSizes(draft.cameraId)}
          >
            {loadingSizes ? <Spinner className="size-3" /> : null}
            {t('mirror.camera.sizes')}
          </Button>
        </div>

        {sizes.length ? (
          <SelectField
            label={t('mirror.camera.resolution')}
            value={draft.cameraSize}
            options={sizeOptions}
            onChange={cameraSize => patch({ cameraSize })}
          />
        ) : (
          <TextField
            label={t('mirror.camera.resolution')}
            value={draft.cameraSize}
            placeholder={t('mirror.camera.resolutionPlaceholder')}
            mono
            onChange={cameraSize => patch({ cameraSize })}
          />
        )}

        <SelectField
          label={t('mirror.camera.facing')}
          value={draft.cameraFacing}
          options={CAMERA_FACING_OPTIONS}
          onChange={cameraFacing => patch({ cameraFacing })}
        />

        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label={t('mirror.camera.fps')}
            hint={t('mirror.option.autoZero')}
            value={draft.cameraFps}
            min={0}
            max={240}
            onChange={cameraFps => patch({ cameraFps })}
          />
          <SelectField
            label={t('mirror.camera.angle')}
            value={draft.angle}
            options={ANGLE_OPTIONS}
            onChange={angle => patch({ angle })}
          />
        </div>

        <CheckField
          label={t('mirror.camera.highSpeed')}
          hint={t('mirror.camera.highSpeedHint')}
          checked={draft.cameraHighSpeed}
          onChange={cameraHighSpeed => patch({ cameraHighSpeed })}
        />
      </FieldGroup>

      <p className="rounded-[7px] border border-line bg-surface-2 px-2.5 py-2 text-[10.5px] leading-relaxed text-muted">
        {t('mirror.camera.note')}
      </p>
      {error ? <p className="text-[11px] leading-relaxed text-danger">{error}</p> : null}
    </div>
  );
}
