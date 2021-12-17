export type ProcessId = number;

export type ServerId = string;

export type ServerLogFile = 'clone' | 'prepare' | 'run' | 'spawn';

export interface Matched {
  name: string;
  startCommand: string;
  prepareCommand: string;
}

export interface Server {
  name: string | undefined;
  id: ServerId;
  cloneUrl: string;
  branch: string;
  port: number | undefined;
}

export interface Matcher {
  getName(repoFolder: string): string;
  getPrepareCommand(repoFolder: string): string;
  getStartCommand(repoFolder: string): string;
  isMatching(repoFolder: string): boolean;
}

export interface CloneUrlCategory {
  category1: string;
  category2: string;
}

export interface CloneUrl {
  id: string;
  cloneUrl: string;
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
  cacheTtl: number;
  minimumPortNumber: number;
  maximumPortNumber: number;
  cleanup: boolean;
}
