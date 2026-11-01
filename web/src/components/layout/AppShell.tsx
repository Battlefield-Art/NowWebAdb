import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  Boxes,
  Cpu,
  FolderTree,
  LayoutDashboard,
  PlugZap,
  ScrollText,
  Sparkles,
  TerminalSquare,
  Unplug,
  type LucideIcon,
} from 'lucide-react';
import { Brand } from '@/components/layout/Brand';
import { LocaleMenu } from '@/components/layout/LocaleMenu';
import { ThemeMenu } from '@/components/layout/ThemeMenu';
import { MirrorPane } from '@/features/mirror/MirrorPane';
import { ConfirmDialog } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useT, type MessageKey } from '@/lib/i18n';
import { cn } from '@/lib/utils/cn';
import { useDeviceStore } from '@/stores/device';

interface NavItem {
  to: string;
  labelKey: MessageKey;
  icon: LucideIcon;
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/overview', labelKey: 'layout.nav.overview', icon: LayoutDashboard },
  { to: '/apps', labelKey: 'layout.nav.apps', icon: Boxes },
  { to: '/files', labelKey: 'layout.nav.files', icon: FolderTree },
  { to: '/logcat', labelKey: 'layout.nav.logcat', icon: ScrollText },
  { to: '/terminal', labelKey: 'layout.nav.terminal', icon: TerminalSquare },
  { to: '/performance', labelKey: 'layout.nav.performance', icon: Activity },
  { to: '/processes', labelKey: 'layout.nav.processes', icon: Cpu },
  { to: '/connection', labelKey: 'layout.nav.connection', icon: PlugZap },
  { to: '/assistant', labelKey: 'layout.nav.assistant', icon: Sparkles },
];

function DeviceBadge() {
  const t = useT();
  const serial = useDeviceStore(state => state.serial);
  const kind = useDeviceStore(state => state.kind);
  const snapshot = useDeviceStore(state => state.snapshot);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-40" />
        <span className="relative inline-flex size-2 rounded-full bg-success" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[12px] font-semibold text-ink">
          {snapshot?.model || serial || t('common.device.connected')}
        </p>
        <p className="truncate text-[10.5px] text-muted">
          {kind === 'usb' ? 'USB' : 'ADB Server'} · {serial}
        </p>
      </div>
    </div>
  );
}

export function AppShell() {
  const t = useT();
  const navigate = useNavigate();
  const disconnect = useDeviceStore(state => state.disconnect);
  const [confirming, setConfirming] = useState(false);
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-dvh flex-col bg-paper text-ink lg:h-dvh">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface/85 px-4 backdrop-blur">
          <Brand />
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden min-w-0 sm:block">
              <DeviceBadge />
            </div>
            <Badge tone="outline" className="hidden md:inline-flex">
              {window.isSecureContext ? t('common.security.secure') : t('common.security.insecure')}
            </Badge>
            <div className="flex items-center gap-0.5">
              <ThemeMenu />
              <LocaleMenu />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted hover:text-danger"
              onClick={() => setConfirming(true)}
            >
              <Unplug />
              <span className="hidden sm:inline">{t('common.disconnect')}</span>
            </Button>
          </div>
        </header>

        <nav className="shrink-0 border-b border-line bg-surface/70">
          <div className="scrollbar-thin flex h-11 items-stretch gap-0.5 overflow-x-auto px-3">
            {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'relative inline-flex shrink-0 items-center gap-1.5 px-3 text-[12.5px] font-semibold transition-colors',
                    'after:absolute after:inset-x-2.5 after:bottom-0 after:h-[2px] after:rounded-full',
                    isActive
                      ? 'text-ink after:bg-accent'
                      : 'text-muted hover:text-ink after:bg-transparent',
                  )
                }
              >
                <Icon className="size-3.5" strokeWidth={2.1} />
                {t(labelKey)}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="flex min-h-0 flex-1 gap-3 px-3 py-3 max-lg:flex-none max-lg:flex-col lg:flex-row">
          <MirrorPane />
          <main className="min-h-0 flex-1 max-lg:overflow-visible lg:overflow-y-auto">
            <div className="mx-auto h-full w-full max-w-[1400px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('layout.disconnect.title')}
        description={t('layout.disconnect.description')}
        confirmLabel={t('layout.disconnect.confirm')}
        onConfirm={() => {
          setConfirming(false);
          void disconnect().finally(() => navigate('/', { replace: true }));
        }}
      />
    </TooltipProvider>
  );
}
