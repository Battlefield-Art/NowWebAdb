import { appsEn } from './apps';
import { assistantEn } from './assistant';
import { commonEn } from './common';
import { connectionEn } from './connection';
import { filesEn } from './files';
import { homeEn } from './home';
import { layoutEn } from './layout';
import { logcatEn } from './logcat';
import { mirrorEn } from './mirror';
import { overviewEn } from './overview';
import { performanceEn } from './performance';
import { processesEn } from './processes';
import { terminalEn } from './terminal';
import type { MessageKey } from '../zh';

export const en: Record<MessageKey, string> = {
  ...commonEn,
  ...layoutEn,
  ...homeEn,
  ...overviewEn,
  ...appsEn,
  ...filesEn,
  ...logcatEn,
  ...terminalEn,
  ...performanceEn,
  ...processesEn,
  ...connectionEn,
  ...mirrorEn,
  ...assistantEn,
};
