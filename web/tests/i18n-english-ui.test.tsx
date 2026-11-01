import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { setLocale } from '@/lib/i18n';
import { AppShell } from '@/components/layout/AppShell';
import AssistantPage from '@/features/assistant/AssistantPage';
import AppsPage from '@/features/apps/AppsPage';
import ConnectionPage from '@/features/connection/ConnectionPage';
import FilesPage from '@/features/files/FilesPage';
import HomePage from '@/features/home/HomePage';
import LogcatPage from '@/features/logcat/LogcatPage';
import { MirrorPane } from '@/features/mirror/MirrorPane';
import OverviewPage from '@/features/overview/OverviewPage';
import PerformancePage from '@/features/performance/PerformancePage';
import ProcessesPage from '@/features/processes/ProcessesPage';
import TerminalPage from '@/features/terminal/TerminalPage';
import { useDeviceStore } from '@/stores/device';

// xterm needs a real canvas renderer; in jsdom its queued frame callbacks outlive
// the unmounted page and throw. The terminal chrome copy under test does not come from xterm.
vi.mock('@xterm/xterm', () => {
  class FakeTerminal {
    rows = 24;
    cols = 80;
    options: Record<string, unknown> = {};
    loadAddon(): void {}
    open(): void {}
    write(): void {}
    writeln(): void {}
    reset(): void {}
    focus(): void {}
    clear(): void {}
    selectAll(): void {}
    paste(): void {}
    dispose(): void {}
    getSelection(): string { return ''; }
    attachCustomKeyEventHandler(): void {}
    onData(): { dispose(): void } { return { dispose: () => undefined }; }
    onResize(): { dispose(): void } { return { dispose: () => undefined }; }
  }
  return { Terminal: FakeTerminal };
});

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit(): void {}
    activate(): void {}
    dispose(): void {}
  },
}));

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;

const PAGES = [
  ['home', HomePage],
  ['overview', OverviewPage],
  ['apps', AppsPage],
  ['files', FilesPage],
  ['logcat', LogcatPage],
  ['processes', ProcessesPage],
  ['performance', PerformancePage],
  ['connection', ConnectionPage],
  ['mirror-pane', MirrorPane],
  ['assistant', AssistantPage],
  ['terminal', TerminalPage],
] as const;

const STUB_DEVICE = new Set(['connection', 'mirror-pane', 'terminal']);

describe('English interface', () => {
  afterEach(() => {
    setLocale('zh-CN');
    useDeviceStore.getState().reset();
  });

  it.each(PAGES)('renders the %s page with no untranslated Chinese copy', async (_name, Page) => {
    setLocale('en-US');
    if (STUB_DEVICE.has(_name)) {
      useDeviceStore.setState({ adb: {} as never, kind: 'server', serial: 'stub', status: 'connected' });
    }
    const { container } = render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.childElementCount).toBeGreaterThan(0));
    expect(container.textContent).not.toMatch(CJK);
  });

  it('renders the app shell navigation with no untranslated Chinese copy', async () => {
    setLocale('en-US');
    useDeviceStore.setState({ adb: {} as never, kind: 'server', serial: 'stub', status: 'connected' });
    const { container } = render(
      <MemoryRouter initialEntries={['/apps']}>
        <AppShell />
      </MemoryRouter>,
    );
    await waitFor(() => expect(container.childElementCount).toBeGreaterThan(0));
    expect(container.textContent).not.toMatch(CJK);
  });
});
