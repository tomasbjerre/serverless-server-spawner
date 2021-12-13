export type ProcessId = number;

export type ServerId = string;

export type ServerLogFile = 'clone' | 'run';

export interface Server {
  pid: ProcessId | undefined;
  id: ServerId;
  cloneUrl: string;
  branch: string;
  status: 'STARTED' | 'STARTING' | 'CREATED';
}
