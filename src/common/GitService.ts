import {
  CloneUrl,
  CloneUrlCategory,
  GitServices,
  BitbucketServer,
  CloneUrlCategoryItem,
} from './Model';
import axios, { AxiosRequestConfig } from 'axios';
export abstract class GitService {
  public static from(gitService: GitServices): GitService {
    if (gitService.bitbucketServer) {
      return new BitbucketService(gitService.bitbucketServer);
    }
    return new EmptyService();
  }
  public abstract getCloneUrlCategories(): Promise<CloneUrlCategory[]>;
  public abstract getCloneUrls(
    category1: string,
    category2: string
  ): Promise<CloneUrl[]>;
}

class EmptyService extends GitService {
  public getCloneUrlCategories(): Promise<CloneUrlCategory[]> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve([]);
      }, 0);
    });
  }
  public getCloneUrls(
    category1: string,
    category2: string
  ): Promise<CloneUrl[]> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve([]);
      }, 0);
    });
  }
}

class BitbucketService extends GitService {
  private config: AxiosRequestConfig;

  constructor(private settings: BitbucketServer) {
    super();
    this.config = settings.personalAccessToken
      ? {
          headers: {
            Authorization: `Bearer ${settings.personalAccessToken}`,
          },
        }
      : {};
  }

  async getProjects(projectKeys: string[]): Promise<CloneUrlCategoryItem[]> {
    const projectsUrl = `${this.settings.url}/projects?limit=9999`;
    const response = await axios.get(projectsUrl, this.config);
    if (response.data.values.length == 0) {
      console.warn(
        `No projects returned from ${projectsUrl}. Perhaps the personalAccessToken is incorrectly configured.`
      );
    }
    return response.data.values
      .filter(
        (it: any) =>
          projectKeys.length == 0 || projectKeys.indexOf(it.key) != -1
      )
      .map((it: any) => {
        return { key: it.key, name: it.name } as CloneUrlCategoryItem;
      });
  }

  async getCloneUrlCategories(): Promise<CloneUrlCategory[]> {
    const categories = [];
    const projects = await this.getProjects(this.settings.projects);
    for (let project of projects) {
      const reposUrl = `${this.settings.url}/projects/${project.key}/repos?limit=9999`;
      const response = await axios.get(reposUrl, this.config);
      categories.push(
        response.data.values.map((it: any) => {
          return {
            category1: project,
            category2: { key: it.slug, name: it.name },
          } as CloneUrlCategory;
        })
      );
    }
    return categories
      .flat()
      .sort((a, b) =>
        `${a.category1}-${a.category2}`.localeCompare(
          `${b.category1}-${b.category2}`
        )
      );
  }

  async getCloneUrls(
    category1: string,
    category2: string
  ): Promise<CloneUrl[]> {
    const repoUrl = `${this.settings.url}/projects/${category1}/repos/${category2}?limit=9999`;
    const repoResponse = await axios.get(repoUrl, this.config);
    const repoBranchUrl = `${this.settings.url}/projects/${category1}/repos/${category2}/branches?limit=9999`;
    const repoBranchResponse = await axios.get(repoBranchUrl, this.config);
    return repoBranchResponse.data.values
      .map((branch: any) => {
        return {
          id: repoResponse.data.slug,
          branch: branch.displayId,
          cloneUrl: repoResponse.data.links.clone //
            // Sort ssh before https
            .sort((a: any, b: any) => b.name.localeCompare(a.name))[0].href,
        } as CloneUrl;
      })
      .sort((a: CloneUrl, b: CloneUrl) =>
        `${a.cloneUrl}-${a.branch}`.localeCompare(`${b.cloneUrl}-${b.branch}`)
      );
  }
}
