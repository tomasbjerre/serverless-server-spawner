import {
  CloneUrl,
  CloneUrlCategory,
  GitServices,
  BitbucketServer,
} from './Model';
import axios, { AxiosRequestConfig } from 'axios';
export abstract class GitService {
  public static from(gitService: GitServices): GitService {
    if (gitService.bitbucketServer) {
      return new BitbucketService(gitService.bitbucketServer);
    }
    throw `No git service`;
  }
  public abstract getCloneUrlCategories(): Promise<CloneUrlCategory[]>;
  public abstract getCloneUrls(category: CloneUrlCategory): Promise<CloneUrl[]>;
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

  async getCloneUrlCategories(): Promise<CloneUrlCategory[]> {
    const categories = [];
    for (let project of this.settings.projects) {
      const reposUrl = `${this.settings.url}/projects/${project}/repos`;
      const response = await axios.get(reposUrl, this.config);
      categories.push(
        ...response.data.map((it: any) => {
          return {
            category1: project,
            category2: it.slug,
          } as CloneUrlCategory;
        })
      );
    }
    return categories;
  }

  async getCloneUrls(category: CloneUrlCategory): Promise<CloneUrl[]> {
    const repoUrl = `${this.settings.url}/projects/${category.category1}/repos/${category.category2}`;
    const repoResponse = await axios.get(repoUrl, this.config);
    const repoBranchUrl = `${this.settings.url}/projects/${category.category1}/repos/${category.category2}/branches`;
    const repoBranchResponse = await axios.get(repoBranchUrl, this.config);
    return repoBranchResponse.data.values.map((branch: any) => {
      return {
        id: repoResponse.data.slug,
        branch: branch.displayId,
        cloneUrl: repoResponse.data.cloneUrl,
      } as CloneUrl;
    });
  }
}
