import { GitServices, BitbucketServer } from '../spawner/Model';
import { CloneUrl, Branch } from './Model';

export abstract class GitService {
  public static from(gitService: GitServices): GitService {
    if (gitService.bitbucketServer) {
      return new BitbucketService(gitService.bitbucketServer);
    }
    throw `No git service`;
  }
  public abstract getCloneUrls(): CloneUrl[];
  public abstract getBranches(): Branch[];
}

export class BitbucketService extends GitService {
  constructor(private settings: BitbucketServer) {
    super();
  }

  getCloneUrls() {
    return [];
  }

  getBranches() {
    return [];
  }
}
