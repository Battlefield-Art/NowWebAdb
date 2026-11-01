import { appsZh } from './apps';
import { assistantZh } from './assistant';
import { commonZh } from './common';
import { connectionZh } from './connection';
import { filesZh } from './files';
import { homeZh } from './home';
import { layoutZh } from './layout';
import { logcatZh } from './logcat';
import { mirrorZh } from './mirror';
import { overviewZh } from './overview';
import { performanceZh } from './performance';
import { processesZh } from './processes';
import { terminalZh } from './terminal';

export const zh = {
  ...commonZh,
  ...layoutZh,
  ...homeZh,
  ...overviewZh,
  ...appsZh,
  ...filesZh,
  ...logcatZh,
  ...terminalZh,
  ...performanceZh,
  ...processesZh,
  ...connectionZh,
  ...mirrorZh,
  ...assistantZh,
} as const;

export type MessageKey = keyof typeof zh;
