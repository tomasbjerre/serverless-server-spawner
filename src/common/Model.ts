export type ServerId = string;

export type ServerLogFile = 'clone' | 'run';

export interface Server {
  pid: number | undefined;
  id: ServerId;
  cloneUrl: string;
  branch: string;
  status: 'STARTED' | 'STARTING' | 'CREATED';
}
