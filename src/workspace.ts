import { serverIdentity } from './common';

export interface Server {
  identity: string;
  status: 'STARTED' | 'STARTING' | 'CREATED';
}

import fs from 'fs'

export class Workspace {
  constructor(private folder: string) {}

  public getOrCreate(cloneUrl: string, branch: string): Server {
    const identity = serverIdentity(cloneUrl, branch);
    // mkdir inside workspace/identity
    // clone repo, checkout branch
    // Check if branch up to date with any prev build, read config and return
    // Find a fitting matcher
    // Derive name and start command
    // Save details in workspace/identity
    // Spawn server
    return {
      status: 'CREATED',
      identity,
    };
  }

  public getServers(): Server[] {
    // collect details in workspace/identity
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
    return    fs.readFileSync(serverlogPath).toString('utf8');
  }

  public killItWithFire(): void {
    // Stop all spawned servers
    // remove everything in workspace
  }
}
