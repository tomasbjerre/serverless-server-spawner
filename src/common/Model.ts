export type ProcessId = number;

export type ServerId = string;

export type ServerLogFile = 'clone' | 'run' | 'spawn';

export interface Matched {
  name: string;
  startCommand: string;
}

export interface Server {
  name: string | undefined;
  id: ServerId;
  cloneUrl: string;
  branch: string;
  status: 'STARTED' | 'STARTING' | 'CREATED';
}
