import { useEffect, useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { listInstalledApps } from '@/lib/adb/packages';
import { useT } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';

export interface BackupPackagePickerProps {
  adb: Adb;
  selected: readonly string[];
  disabled: boolean;
  onChange: (packages: readonly string[]) => void;
}

export function BackupPackagePicker({ adb, selected, disabled, onChange }: BackupPackagePickerProps) {
  const t = useT();
  const [apps, setApps] = useState<readonly string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const list = await listInstalledApps(adb, { scope: 'thirdParty' });
        if (active) setApps(list.map(app => app.packageName));
      } catch (cause) {
        if (active) setError(toErrorMessage(cause));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [adb]);

  const keyword = query.trim().toLowerCase();
  const filtered = keyword ? apps.filter(name => name.toLowerCase().includes(keyword)) : apps;
  const selectedSet = new Set(selected);

  const toggle = (name: string, checked: boolean): void => {
    const next = new Set(selected);
    if (checked) next.add(name);
    else next.delete(name);
    onChange([...next]);
  };

  const selectVisible = (): void => {
    const next = new Set(selected);
    filtered.forEach(name => next.add(name));
    onChange([...next]);
  };

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-1.5">
        <Input
          value={query}
          className="h-7 flex-1"
          aria-label={t('connection.backupPicker.searchAria')}
          placeholder={t('connection.backupPicker.searchPlaceholder')}
          leading={<Search />}
          disabled={loading || disabled}
          onChange={event => setQuery(event.target.value)}
        />
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || !filtered.length}
          onClick={selectVisible}
        >
          {t('connection.backupPicker.selectVisible')}
        </Button>
        <Button variant="ghost" size="sm" disabled={disabled || !selected.length} onClick={() => onChange([])}>
          {t('common.clear')}
        </Button>
      </div>
      {loading ? (
        <div className="flex h-[132px] items-center justify-center gap-2 text-[11px] text-muted">
          <Spinner className="size-3.5" />
          {t('connection.backupPicker.loading')}
        </div>
      ) : error ? (
        <p className="rounded-[8px] border border-line-soft bg-surface px-2 py-1.5 text-[10.5px] leading-relaxed text-danger">
          {error}
        </p>
      ) : (
        <div className="max-h-[132px] overflow-y-auto rounded-[8px] border border-line-soft bg-surface p-1">
          {filtered.length ? (
            filtered.map(name => (
              <label
                key={name}
                className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-surface-3"
              >
                <Checkbox
                  checked={selectedSet.has(name)}
                  disabled={disabled}
                  onCheckedChange={value => toggle(name, value === true)}
                />
                <span className="min-w-0 truncate font-mono text-[10.5px] text-ink-soft" title={name}>
                  {name}
                </span>
              </label>
            ))
          ) : (
            <p className="px-2 py-6 text-center text-[10.5px] text-muted">{t('connection.backupPicker.empty')}</p>
          )}
        </div>
      )}
      <p className="text-[10px] text-muted-2">
        {t('connection.backupPicker.footer', { count: selected.length })}
      </p>
    </div>
  );
}
