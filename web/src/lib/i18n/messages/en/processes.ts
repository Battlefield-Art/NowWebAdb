import type { processesZh } from '../zh/processes';

export const processesEn: Record<keyof typeof processesZh, string> = {
  'processes.title': 'Device processes',
  'processes.description':
    'Inspect running processes and resident memory, and kill misbehaving apps. System processes usually require root.',
  'processes.action.refresh': 'Refresh list',
  'processes.search.placeholder': 'Search name / user / PID',
  'processes.search.aria': 'Search processes',
  'processes.sort.aria': 'Sort processes',
  'processes.sort.memory': 'Sort by memory',
  'processes.sort.name': 'Sort by name',
  'processes.sort.pid': 'Sort by PID',
  'processes.count': '{visible} / {total} processes',
  'processes.count.one': '{visible} / {total} process',
  'processes.table.process': 'Process',
  'processes.table.user': 'User',
  'processes.table.memory': 'Memory',
  'processes.empty.filtered': 'No matching processes',
  'processes.empty.none': 'No processes loaded',
  'processes.loading': 'Loading processes…',
  'processes.kill.aria': 'Kill process {name} ({pid})',
  'processes.kill.title': 'Kill process',
  'processes.confirm.title': 'Kill {name}?',
  'processes.confirm.fallbackTitle': 'Kill process?',
  'processes.confirm.description':
    'SIGKILL will be sent to PID {pid} ({user}). The app may crash or lose unsaved data, and some system processes require root.',
  'processes.confirm.unknownUser': 'unknown user',
  'processes.confirm.kill': 'Kill process',
  'processes.toast.killed': 'Killed process {pid}',
  'processes.error.invalidPid': 'Invalid process PID',
  'processes.error.killFailed': 'Failed to kill process {pid}; root permission may be required',
};
