import { getLocale, t } from '@/lib/i18n';

export function formatBytes(size: number, fractionDigits = 2): string {
  if (!Number.isFinite(size) || size < 0) return '—';
  if (size < 1024) return `${size} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = size / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index] ?? unit;
  }
  return `${value.toFixed(fractionDigits)} ${unit}`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat(getLocale()).format(value);
}

export function formatClockTime(value: number | Date): string {
  return new Date(value).toLocaleTimeString(getLocale(), { hour12: false });
}

export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts = [
    days > 0 ? t('common.time.days', { count: days }) : '',
    hours > 0 ? t('common.time.hours', { count: hours }) : '',
    t('common.time.minutes', { count: minutes }),
  ];
  return parts.filter(Boolean).join(' ');
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return t('common.unknownError');
}
