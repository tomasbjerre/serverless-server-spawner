export interface BitbucketServer {
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
