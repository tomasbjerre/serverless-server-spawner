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
}

export interface Matcher {
  getName(repoFolder: string): string;
  getStartCommand(repoFolder: string): string;
  isMatching(repoFolder: string): boolean;
}

export interface CloneUrl {
  id: string;
  url: string;
  name: string;
}

export interface Branch {
  id: string;
  branch: string;
  name: string;
}
