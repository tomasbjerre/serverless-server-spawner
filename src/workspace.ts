import { serverIdentity } from './common';

export interface Server {
  identity: string;
  status: 'STARTED' | 'STARTING' | 'CREATED';
}

export class Workspace {
  constructor(private folder: string) {}

  public getOrCreate(cloneUrl: string, branch: string): Server {
    const identity = serverIdentity(cloneUrl, branch);
    return {
      status: 'CREATED',
      identity,
    };
  }

  public getServers(): Server[] {
    return [];
  }

  public getServer(id: string): Server {
    const found = this.getServers().find((it) => it.identity == id);
    if (found) {
      return found;
    }
    throw `${id} not found`;
  }

  public getServerLog(id: string): string {
    const serverlogPath = `${this.folder}/${id}/log`;
    return `content of ${serverlogPath}`;
  }

  public killItWithFire(): void {}
}
