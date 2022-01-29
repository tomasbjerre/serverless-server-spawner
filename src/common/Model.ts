export type ProcessId = number;

export type ServerId = string;

export type ServerLogFile = 'clone' | 'prepare' | 'run' | 'spawn';
export type ServerState = ServerLogFile | 'nopid';

export interface Matched {
  name: string;
  startCommand: string;
  prepareCommand: string;
  preStart: (repoFolder: string, env: any) => void;
}

export interface Matcher {
  getName(repoFolder: string): string;
  getPrepareCommand(repoFolder: string): string;
  getStartCommand(repoFolder: string): string;
  isMatching(repoFolder: string): boolean;
  preStart: (repoFolder: string, env: any) => void;
}

export interface Server {
  name: string;
  id: ServerId;
  cloneUrl: string;
  branch: string;
  port: number | undefined;
  startTimestamp: number;
  endTimestamp: number;
  revision: string | undefined;
  inactive: boolean;
  state: ServerState;
}

export interface CloneUrlCategoryItem {
  key: string;
  name: string;
}
export interface CloneUrlCategory {
  category1: CloneUrlCategoryItem;
  category2: CloneUrlCategoryItem;
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
  integrationCacheTtl: number;
  minimumPortNumber: number;
  maximumPortNumber: number;
  cleanup: boolean;
  minimumSecondsBetweenDispatch: number;
}
