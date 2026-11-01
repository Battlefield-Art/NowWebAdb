import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { AppShell } from '@/components/layout/AppShell';
import { useT } from '@/lib/i18n';
import { useDeviceStore } from '@/stores/device';

const HomePage = lazy(() => import('@/features/home/HomePage'));
const OverviewPage = lazy(() => import('@/features/overview/OverviewPage'));
const AppsPage = lazy(() => import('@/features/apps/AppsPage'));
const FilesPage = lazy(() => import('@/features/files/FilesPage'));
const LogcatPage = lazy(() => import('@/features/logcat/LogcatPage'));
const TerminalPage = lazy(() => import('@/features/terminal/TerminalPage'));
const PerformancePage = lazy(() => import('@/features/performance/PerformancePage'));
const ProcessesPage = lazy(() => import('@/features/processes/ProcessesPage'));
const ConnectionPage = lazy(() => import('@/features/connection/ConnectionPage'));
const AssistantPage = lazy(() => import('@/features/assistant/AssistantPage'));

function PageFallback() {
  const t = useT();
  return (
    <div className="flex h-[calc(100vh-56px)] items-center justify-center gap-2 text-[12px] text-muted">
      <Spinner />
      {t('layout.pageLoading')}
    </div>
  );
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

function RequireDevice({ children }: { children: ReactNode }) {
  const connected = useDeviceStore(state => state.status === 'connected' && state.adb !== null);
  if (!connected) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Lazy>
            <HomePage />
          </Lazy>
        }
      />
      <Route
        element={
          <RequireDevice>
            <AppShell />
          </RequireDevice>
        }
      >
        <Route path="/overview" element={<Lazy><OverviewPage /></Lazy>} />
        <Route path="/mirror" element={<Navigate to="/overview" replace />} />
        <Route path="/apps" element={<Lazy><AppsPage /></Lazy>} />
        <Route path="/files" element={<Lazy><FilesPage /></Lazy>} />
        <Route path="/logcat" element={<Lazy><LogcatPage /></Lazy>} />
        <Route path="/terminal" element={<Lazy><TerminalPage /></Lazy>} />
        <Route path="/performance" element={<Lazy><PerformancePage /></Lazy>} />
        <Route path="/processes" element={<Lazy><ProcessesPage /></Lazy>} />
        <Route path="/connection" element={<Lazy><ConnectionPage /></Lazy>} />
        <Route path="/assistant" element={<Lazy><AssistantPage /></Lazy>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
