import { CloneUrl, Branch, GitServices, BitbucketServer } from './Model';
import axios, { AxiosRequestConfig } from 'axios';
export abstract class GitService {
  public static from(gitService: GitServices): GitService {
    if (gitService.bitbucketServer) {
      return new BitbucketService(gitService.bitbucketServer);
    }
    throw `No git service`;
  }
  public async getCloneUrls(): Promise<CloneUrl[]> {
    return [];
  }
  public async getBranches(cloneUrl: string): Promise<Branch[]> {
    return [];
  }
}

class BitbucketService extends GitService {
  private config: AxiosRequestConfig;
  constructor(private settings: BitbucketServer) {
    super();
    this.config = {
      headers: {
        Authorization: `Bearer ${settings.personalAccessToken}`,
      },
    };
  }

  async getCloneUrls(): Promise<CloneUrl[]> {
    const repos = [];
    for (let project of this.settings.projects) {
      const reposUrl = `${this.settings.url}/projects/${project}/repos`;
      const response = await axios.get(reposUrl, this.config);
      repos.push(
        ...response.data.map((it: any) => {
          return {
            id: it.slug,
            url: it.cloneUrl,
          } as CloneUrl;
        })
      );
    }
    return repos;
  }

  async getBranches(cloneUrl: string): Promise<Branch[]> {
    return []; //TODO
  }
}
