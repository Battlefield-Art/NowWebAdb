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
import { validateRemoteName } from '@/lib/adb/paths';
import { toErrorMessage } from '@/lib/utils/format';
import { t } from '@/lib/i18n';

export interface NameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel: string;
  onSubmit: (name: string) => Promise<boolean>;
}

export function NameDialog(props: NameDialogProps) {
  const [value, setValue] = useState(props.initialValue ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    let name: string;
    try {
      name = validateRemoteName(value);
    } catch (cause) {
      setError(toErrorMessage(cause));
      return;
    }
    setError('');
    setBusy(true);
    try {
      const ok = await props.onSubmit(name);
      if (ok) props.onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="w-[min(420px,94vw)]">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          {props.description ? <DialogDescription>{props.description}</DialogDescription> : null}
        </DialogHeader>
        <DialogBody>
          <Field label={props.label} error={error}>
            <Input
              value={value}
              placeholder={props.placeholder}
              autoFocus
              disabled={busy}
              aria-label={props.label}
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
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="md" disabled={busy} onClick={() => props.onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" size="md" disabled={busy} onClick={() => void submit()}>
            {busy ? <Spinner className="size-3 text-white" /> : null}
            {props.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
