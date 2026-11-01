import type { ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import { draftOptionLabel, type DraftOption } from './mirrorOptions';

export const FIELD_CLASS =
  'h-8 w-full rounded-control border border-line-strong bg-surface px-2 text-[12px] text-ink outline-none transition-colors focus:border-accent disabled:opacity-50';

const LABEL_CLASS = 'text-[11.5px] text-muted';
const HINT_CLASS = 'text-[10.5px] leading-relaxed text-muted-2';

export interface FieldProps {
  label: string;
  hint?: string;
  disabled?: boolean;
}

export function NumberField({
  label,
  hint,
  disabled,
  value,
  onChange,
  min,
  max,
  step = 1,
}: FieldProps & {
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <label className="grid gap-1">
      <span className="flex items-baseline justify-between gap-2">
        <span className={LABEL_CLASS}>{label}</span>
        {hint ? <span className={HINT_CLASS}>{hint}</span> : null}
      </span>
      <input
        type="number"
        inputMode="numeric"
        className={FIELD_CLASS}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}

export function TextField({
  label,
  hint,
  disabled,
  value,
  onChange,
  placeholder,
  mono,
}: FieldProps & {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <label className="grid gap-1">
      <span className={LABEL_CLASS}>{label}</span>
      <input
        className={cn(FIELD_CLASS, mono && 'font-mono text-[11px]')}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={label}
        onChange={event => onChange(event.target.value)}
      />
      {hint ? <span className={HINT_CLASS}>{hint}</span> : null}
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  hint,
  disabled,
  value,
  options,
  onChange,
}: FieldProps & {
  value: T;
  options: readonly DraftOption<T>[];
  onChange: (value: T) => void;
}) {
  const t = useT();
  return (
    <label className="grid gap-1">
      <span className={LABEL_CLASS}>{label}</span>
      <select
        className={FIELD_CLASS}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={event => onChange(event.target.value as T)}
      >
        {options.map(option => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {draftOptionLabel(option, t)}
          </option>
        ))}
      </select>
      {hint ? <span className={HINT_CLASS}>{hint}</span> : null}
    </label>
  );
}

export function CheckField({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: FieldProps & {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={cn('flex items-start gap-2', disabled && 'opacity-55')}>
      <Checkbox
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onCheckedChange={value => onChange(value === true)}
      />
      <span className="grid gap-0.5">
        <span className="text-[11.5px] text-ink-soft">{label}</span>
        {hint ? <span className={HINT_CLASS}>{hint}</span> : null}
      </span>
    </label>
  );
}

export function FieldGroup({ title, action, children }: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-2">{title}</span>
        {action}
      </div>
      {children}
    </section>
  );
}
