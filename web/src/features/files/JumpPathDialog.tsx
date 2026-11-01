import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { normalizeRemotePath } from '@/lib/adb/paths';
import { toErrorMessage } from '@/lib/utils/format';
import { t } from '@/lib/i18n';

const SHORTCUTS = ['/sdcard', '/sdcard/Download', '/sdcard/DCIM', '/data/local/tmp'] as const;

export interface JumpPathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: string;
  onSubmit: (path: string) => Promise<boolean>;
}

export function JumpPathDialog({ open, onOpenChange, initialValue, onSubmit }: JumpPathDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    let target: string;
    try {
      target = normalizeRemotePath(value);
    } catch (cause) {
      setError(toErrorMessage(cause));
      return;
    }
    setError('');
    setBusy(true);
    try {
      if (await onSubmit(target)) onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(460px,94vw)]">
        <DialogHeader>
          <DialogTitle>{t('files.jump.title')}</DialogTitle>
          <DialogDescription>{t('files.jump.description')}</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-3">
          <Field label={t('files.jump.label')} error={error}>
            <Input
              value={value}
              autoFocus
              disabled={busy}
              aria-label={t('files.jump.label')}
              className="font-mono"
              onChange={event => {
                setValue(event.target.value);
                setError('');
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void submit();
                }
              }}
            />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {SHORTCUTS.map(path => (
              <Button key={path} size="sm" variant="ghost" disabled={busy} onClick={() => setValue(path)}>
                {path}
              </Button>
            ))}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="md" disabled={busy} onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" size="md" disabled={busy} onClick={() => void submit()}>
            {busy ? <Spinner className="size-3 text-white" /> : null}
            {t('files.jump.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
