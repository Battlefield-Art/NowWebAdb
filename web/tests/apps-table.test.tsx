import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppsTableCard } from '@/features/apps/AppsTableCard';
import type { AppMetadataController } from '@/features/apps/useAppMetadata';
import type { AppsCatalog } from '@/features/apps/useAppsCatalog';
import type { InstalledApp } from '@/lib/adb/packages';

const apps: InstalledApp[] = [
  {
    packageName: 'com.example.notes',
    sourceDir: '/data/app/notes/base.apk',
    versionCode: 42,
    installer: 'com.android.vending',
    uid: 10123,
  },
  { packageName: 'com.android.settings', sourceDir: '/system/priv-app/Settings/base.apk' },
];

const entries: AppMetadataController['entries'] = {
  'com.example.notes': { appName: '记事本', icon: '', versionName: '1.2.3', versionCode: 42 },
};

function makeCatalog(overrides: Partial<AppsCatalog> = {}): AppsCatalog {
  return {
    apps,
    loading: false,
    error: '',
    scope: 'all',
    enabled: 'all',
    search: '',
    ascending: true,
    selected: new Set<string>(),
    setScope: vi.fn(),
    setEnabled: vi.fn(),
    setSearch: vi.fn(),
    setAscending: vi.fn(),
    refresh: vi.fn(),
    toggle: vi.fn(),
    toggleAll: vi.fn(),
    clearSelection: vi.fn(),
    removeLocal: vi.fn(),
    ...overrides,
  };
}

function makeMetadata(overrides: Partial<AppMetadataController> = {}): AppMetadataController {
  return {
    entries,
    progress: { loading: false, done: 2, total: 2 },
    retry: vi.fn(),
    cancel: vi.fn(),
    ...overrides,
  };
}

function renderCard(options: {
  catalog?: AppsCatalog;
  visibleApps?: readonly InstalledApp[];
  onExport?: (packages: readonly string[]) => void;
  onUninstall?: (packages: readonly string[]) => void;
} = {}) {
  const onExport = options.onExport ?? vi.fn();
  const onUninstall = options.onUninstall ?? vi.fn();
  render(
    <AppsTableCard
      catalog={options.catalog ?? makeCatalog()}
      metadata={makeMetadata()}
      metadataErrors={0}
      visibleApps={options.visibleApps ?? apps}
      busy={false}
      busyPackage={null}
      batchBusy={false}
      exportProgress={null}
      onCancelExport={vi.fn()}
      onExport={onExport}
      onUninstall={onUninstall}
      onDetails={vi.fn()}
      onAction={vi.fn()}
    />,
  );
  return { onExport, onUninstall };
}

describe('AppsTableCard', () => {
  it('renders app names, packages, versions and scope badges', () => {
    renderCard();
    expect(screen.getByText('记事本')).toBeInTheDocument();
    expect(screen.getAllByText('com.example.notes').length).toBeGreaterThan(0);
    expect(screen.getByText('com.android.settings')).toBeInTheDocument();
    expect(screen.getByText('1.2.3')).toBeInTheDocument();
    expect(screen.getByText('用户')).toBeInTheDocument();
    expect(screen.getByText('系统')).toBeInTheDocument();
    expect(screen.getByText('名称与图标未读取')).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.tagName === 'SPAN' && element.textContent === '显示 2 / 2 个应用'),
    ).toBeInTheDocument();
  });

  it('selects all visible apps from the header checkbox', async () => {
    const catalog = makeCatalog();
    renderCard({ catalog });
    await userEvent.click(screen.getByRole('checkbox', { name: '选择当前筛选结果' }));
    expect(catalog.toggleAll).toHaveBeenCalledWith(['com.example.notes', 'com.android.settings'], true);
  });

  it('exports and uninstalls the current selection', async () => {
    const selected = new Set(['com.example.notes']);
    const { onExport, onUninstall } = renderCard({ catalog: makeCatalog({ selected }) });
    expect(
      screen.getByText((_, element) => element?.tagName === 'SPAN' && element.textContent === '已选 1 项'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '导出安装包' }));
    expect(onExport).toHaveBeenCalledWith(['com.example.notes']);
    await userEvent.click(screen.getByRole('button', { name: '卸载所选' }));
    expect(onUninstall).toHaveBeenCalledWith(['com.example.notes']);
  });

  it('shows a search-specific empty state and can clear the query', async () => {
    const catalog = makeCatalog({ search: 'zzz' });
    renderCard({ catalog, visibleApps: [] });
    expect(screen.getByText('没有匹配的应用')).toBeInTheDocument();
    const clearButtons = screen.getAllByRole('button', { name: '清除搜索' });
    await userEvent.click(clearButtons[clearButtons.length - 1] as HTMLElement);
    expect(catalog.setSearch).toHaveBeenCalledWith('');
  });

  it('shows the list error with a retry action', async () => {
    const catalog = makeCatalog({ error: '设备已断开' });
    renderCard({ catalog });
    expect(screen.getByText('设备已断开')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '重新读取' }));
    expect(catalog.refresh).toHaveBeenCalled();
  });
});
