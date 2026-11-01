import { Users } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { SimpleSelect } from '@/components/ui/select';
import type { AppInstallOptions } from '@/lib/adb/packages';
import type { AndroidUser } from '@/lib/adb/users';
import { useT, type MessageKey } from '@/lib/i18n';

const INSTALL_FLAGS: ReadonlyArray<{
  key: keyof AppInstallOptions;
  labelKey: MessageKey;
  hintKey: MessageKey;
}> = [
  {
    key: 'skipExisting',
    labelKey: 'apps.installOptions.overwrite',
    hintKey: 'apps.installOptions.overwriteHint',
  },
  {
    key: 'requestDowngrade',
    labelKey: 'apps.installOptions.downgrade',
    hintKey: 'apps.installOptions.downgradeHint',
  },
  {
    key: 'grantRuntimePermissions',
    labelKey: 'apps.installOptions.grant',
    hintKey: 'apps.installOptions.grantHint',
  },
  { key: 'allowTest', labelKey: 'apps.installOptions.testOnly', hintKey: 'apps.installOptions.testOnlyHint' },
  { key: 'internalStorage', labelKey: 'apps.installOptions.internal', hintKey: 'apps.installOptions.internalHint' },
];

export interface InstallOptionFieldsProps {
  flags: AppInstallOptions;
  users: readonly AndroidUser[];
  user: string;
  disabled: boolean;
  onFlagChange: (key: keyof AppInstallOptions, value: boolean) => void;
  onUserChange: (value: string) => void;
}

export function InstallOptionFields({
  flags,
  users,
  user,
  disabled,
  onFlagChange,
  onUserChange,
}: InstallOptionFieldsProps) {
  const t = useT();
  const userOptions = [
    { value: 'current', label: t('apps.installOptions.currentUser') },
    { value: 'all', label: t('apps.installOptions.allUsers') },
    ...users.map(item => ({
      value: String(item.id),
      label: item.running
        ? `${item.id} · ${item.name}`
        : t('apps.installOptions.userNotRunning', { id: item.id, name: item.name }),
    })),
  ];

  return (
    <>
      <div className="grid gap-1.5">
        <span className="text-[10.5px] font-semibold text-muted">{t('apps.installOptions.title')}</span>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {INSTALL_FLAGS.map(option => (
            <label
              key={option.key}
              className="flex items-center gap-1.5 text-[11px] text-ink-soft"
              title={t(option.hintKey)}
            >
              <Checkbox
                checked={flags[option.key]}
                disabled={disabled}
                onCheckedChange={value => onFlagChange(option.key, value === true)}
              />
              {t(option.labelKey)}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-muted">
          <Users className="size-3.5 text-muted-2" />
          {t('apps.installOptions.user')}
        </span>
        <SimpleSelect
          value={user}
          onValueChange={onUserChange}
          options={userOptions}
          disabled={disabled}
          className="h-7 w-[190px] text-[11.5px]"
          aria-label={t('apps.installOptions.user')}
        />
      </div>
    </>
  );
}
