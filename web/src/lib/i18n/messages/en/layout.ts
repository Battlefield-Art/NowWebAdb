import type { layoutZh } from '../zh/layout';

export const layoutEn: Record<keyof typeof layoutZh, string> = {
  'layout.nav.overview': 'Overview',
  'layout.nav.apps': 'Apps',
  'layout.nav.files': 'Files',
  'layout.nav.logcat': 'Logs',
  'layout.nav.terminal': 'Terminal',
  'layout.nav.performance': 'Performance',
  'layout.nav.processes': 'Processes',
  'layout.nav.connection': 'Connection',
  'layout.nav.assistant': 'Assistant',
  'layout.appearance': 'Appearance',
  'layout.appearance.light': 'Light',
  'layout.appearance.dark': 'Dark',
  'layout.appearance.system': 'System',
  'layout.language': 'Language',
  'layout.disconnect.title': 'Disconnect this device?',
  'layout.disconnect.description':
    'Active file transfers, log streams, and terminal sessions will stop. You can reconnect at any time.',
  'layout.disconnect.confirm': 'Disconnect',
  'layout.pageLoading': 'Loading page…',
};
