export type GitService = 'bitbucket-server' | 'none';

export interface ServerSettings {
  port: number;
  workspace: string;
  dashboardUrl: string;
  matchersFolder: string;
  timeToLive: number;
  gitService: GitService;
}
