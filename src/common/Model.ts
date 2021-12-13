export type ProcessId = number;

export type ServerId = string;

export type ServerLogFile = 'clone' | 'run';

export interface Matched {
  name: string;
  startCommand: string;
}

export interface Server {
  pid: ProcessId | undefined;
  name: string | undefined;
  id: ServerId;
  cloneUrl: string;
  branch: string;
  status: 'STARTED' | 'STARTING' | 'CREATED';
}
