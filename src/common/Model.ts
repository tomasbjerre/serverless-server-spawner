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
}

export interface Branch {
  id: string;
  branch: string;
}

export interface BitbucketServer {
  projects: string[];
  personalAccessToken: string;
  url: string;
}

export interface GitServices {
  bitbucketServer: BitbucketServer | undefined;
}
export interface ServerSettings {
  port: number;
  workspace: string;
  dashboardUrl: string;
  matchersFolder: string;
  timeToLive: number;
  gitService: GitServices;
}
