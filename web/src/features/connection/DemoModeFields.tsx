import { useState } from 'react';
import type { Adb } from '@yume-chan/adb';
import type { DemoMode } from '@yume-chan/android-bin';
import { toast } from 'sonner';
import {
  DemoModeMobileDataTypes,
  DemoModeSignalStrength,
  DemoModeStatusBarModes,
  demoModeService,
  type DemoModeMobileDataType,
  type DemoModeStatusBarMode,
} from '@/lib/adb/demoMode';
import { useT, type MessageKey } from '@/lib/i18n';
import { toErrorMessage } from '@/lib/utils/format';
import { ApplyRow, SelectRow, ToggleRow } from './DemoModeRows';

interface SignalOption {
  value: DemoModeSignalStrength;
  labelKey: MessageKey;
  level?: number;
}

const SIGNAL_OPTIONS: readonly SignalOption[] = [
  { value: DemoModeSignalStrength.Hidden, labelKey: 'connection.demoModeFields.signalHidden' },
  { value: DemoModeSignalStrength.Level0, labelKey: 'connection.demoModeFields.signalLevel', level: 0 },
  { value: DemoModeSignalStrength.Level1, labelKey: 'connection.demoModeFields.signalLevel', level: 1 },
  { value: DemoModeSignalStrength.Level2, labelKey: 'connection.demoModeFields.signalLevel', level: 2 },
  { value: DemoModeSignalStrength.Level3, labelKey: 'connection.demoModeFields.signalLevel', level: 3 },
  { value: DemoModeSignalStrength.Level4, labelKey: 'connection.demoModeFields.signalLevel', level: 4 },
];

const DATA_OPTIONS = DemoModeMobileDataTypes.map(value => ({ value, label: value.toUpperCase() }));

const BAR_LABEL_KEYS: Record<DemoModeStatusBarMode, MessageKey> = {
  opaque: 'connection.demoModeFields.barOpaque',
  translucent: 'connection.demoModeFields.barTranslucent',
  'semi-transparent': 'connection.demoModeFields.barSemiTransparent',
  transparent: 'connection.demoModeFields.barTransparent',
  warning: 'connection.demoModeFields.barWarning',
};

export interface DemoModeFieldsProps {
  adb: Adb;
  disabled: boolean;
}

export function DemoModeFields({ adb, disabled }: DemoModeFieldsProps) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [battery, setBattery] = useState('80');
  const [charging, setCharging] = useState(true);
  const [airplane, setAirplane] = useState(false);
  const [wifi, setWifi] = useState<DemoModeSignalStrength>(DemoModeSignalStrength.Level4);
  const [mobile, setMobile] = useState<DemoModeSignalStrength>(DemoModeSignalStrength.Level4);
  const [dataType, setDataType] = useState<DemoModeMobileDataType>('5g');
  const [barMode, setBarMode] = useState<DemoModeStatusBarMode>('opaque');
  const [clock, setClock] = useState('09:30');
  const locked = disabled || busy;
  const signalOptions = SIGNAL_OPTIONS.map(option => ({
    value: option.value,
    label: t(option.labelKey, option.level === undefined ? undefined : { level: option.level }),
  }));
  const barOptions = DemoModeStatusBarModes.map(value => ({ value, label: t(BAR_LABEL_KEYS[value]) }));

  const run = async (label: string, action: (mode: DemoMode) => Promise<void>): Promise<boolean> => {
    setBusy(true);
    try {
      await action(demoModeService(adb));
      toast.success(t('connection.demoModeFields.applied', { label }));
      return true;
    } catch (cause) {
      toast.error(toErrorMessage(cause));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const applyBattery = async (): Promise<void> => {
    const level = Number(battery);
    if (!Number.isInteger(level) || level < 0 || level > 100) {
      toast.error(t('connection.demoModeFields.batteryInvalid'));
      return;
    }
    await run(t('connection.demoModeFields.battery'), mode => mode.setBatteryLevel(level));
  };

  const applyClock = async (): Promise<void> => {
    const match = /^(\d{1,2}):?(\d{2})$/.exec(clock.trim());
    if (!match) {
      toast.error(t('connection.demoModeFields.timeFormat'));
      return;
    }
    const hour = Number(match[1] ?? NaN);
    const minute = Number(match[2] ?? NaN);
    if (hour > 23 || minute > 59) {
      toast.error(t('connection.demoModeFields.timeRange'));
      return;
    }
    await run(t('connection.demoModeFields.clock'), mode => mode.setTime(hour, minute));
  };

  const changeWifi = async (value: string): Promise<void> => {
    const next = value as DemoModeSignalStrength;
    if (await run(t('connection.demoModeFields.wifi'), mode => mode.setWifiSignalStrength(next))) setWifi(next);
  };

  const changeMobile = async (value: string): Promise<void> => {
    const next = value as DemoModeSignalStrength;
    if (await run(t('connection.demoModeFields.mobile'), mode => mode.setMobileSignalStrength(next))) setMobile(next);
  };

  const changeDataType = async (value: string): Promise<void> => {
    const next = value as DemoModeMobileDataType;
    if (await run(t('connection.demoModeFields.actionMobileData'), mode => mode.setMobileDataType(next))) {
      setDataType(next);
    }
  };

  const changeBarMode = async (value: string): Promise<void> => {
    const next = value as DemoModeStatusBarMode;
    if (await run(t('connection.demoModeFields.barMode'), mode => mode.setStatusBarMode(next))) setBarMode(next);
  };

  const toggleCharging = async (checked: boolean): Promise<void> => {
    if (await run(t('connection.demoModeFields.actionCharging'), mode => mode.setBatteryCharging(checked))) {
      setCharging(checked);
    }
  };

  const toggleAirplane = async (checked: boolean): Promise<void> => {
    if (await run(t('connection.demoModeFields.actionAirplane'), mode => mode.setAirplaneMode(checked))) {
      setAirplane(checked);
    }
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <ApplyRow
        label={t('connection.demoModeFields.battery')}
        value={battery}
        disabled={locked}
        input={{ type: 'number', min: 0, max: 100 }}
        onChange={setBattery}
        onApply={() => void applyBattery()}
      />
      <ToggleRow
        label={t('connection.demoModeFields.charging')}
        checked={charging}
        disabled={locked}
        onChange={checked => void toggleCharging(checked)}
      />
      <ToggleRow
        label={t('connection.demoModeFields.airplane')}
        checked={airplane}
        disabled={locked}
        onChange={checked => void toggleAirplane(checked)}
      />
      <SelectRow
        label={t('connection.demoModeFields.wifi')}
        value={wifi}
        options={signalOptions}
        disabled={locked}
        onChange={value => void changeWifi(value)}
      />
      <SelectRow
        label={t('connection.demoModeFields.mobile')}
        value={mobile}
        options={signalOptions}
        disabled={locked}
        onChange={value => void changeMobile(value)}
      />
      <SelectRow
        label={t('connection.demoModeFields.mobileData')}
        value={dataType}
        options={DATA_OPTIONS}
        disabled={locked}
        onChange={value => void changeDataType(value)}
      />
      <SelectRow
        label={t('connection.demoModeFields.barMode')}
        value={barMode}
        options={barOptions}
        disabled={locked}
        onChange={value => void changeBarMode(value)}
      />
      <ApplyRow
        label={t('connection.demoModeFields.clock')}
        value={clock}
        disabled={locked}
        input={{ placeholder: 'HH:MM' }}
        onChange={setClock}
        onApply={() => void applyClock()}
      />
    </div>
  );
}
