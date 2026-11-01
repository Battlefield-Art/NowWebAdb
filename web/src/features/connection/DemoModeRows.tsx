import type { InputHTMLAttributes, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SimpleSelect, type SelectOption } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useT } from '@/lib/i18n';

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-[8px] border border-line-soft bg-surface-2 px-2.5 py-2">
      <p className="text-[10.5px] font-semibold text-ink-soft">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function ToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[8px] border border-line-soft bg-surface-2 px-2.5 py-2">
      <span className="text-[10.5px] font-semibold text-ink-soft">{label}</span>
      <Switch aria-label={label} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

export function SelectRow({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly SelectOption[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Row label={label}>
      <SimpleSelect aria-label={label} value={value} options={options} disabled={disabled} onValueChange={onChange} />
    </Row>
  );
}

export function ApplyRow({
  label,
  value,
  disabled,
  input,
  onChange,
  onApply,
}: {
  label: string;
  value: string;
  disabled: boolean;
  input?: Pick<InputHTMLAttributes<HTMLInputElement>, 'type' | 'min' | 'max' | 'placeholder'>;
  onChange: (value: string) => void;
  onApply: () => void;
}) {
  const t = useT();
  return (
    <Row label={label}>
      <div className="flex gap-1.5">
        <Input
          {...input}
          value={value}
          disabled={disabled}
          aria-label={label}
          onChange={event => onChange(event.target.value)}
        />
        <Button size="md" variant="outline" disabled={disabled} onClick={onApply}>
          {t('common.apply')}
        </Button>
      </div>
    </Row>
  );
}
