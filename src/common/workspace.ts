import fs from 'fs';
import { Server, ServerId, ServerLogFile } from './Model';

export class Workspace {
  constructor(private folder: string) {}

  public getServers(): Server[] {
    // collect details in workspace/identity
    return [];
  }

  public getServer(id: ServerId): Server {
    const found = this.getServers().find((it) => it.id == id);
    if (found) {
      return found;
    }
    throw `${id} not found`;
  }

  public getServerLog(id: ServerId, file: ServerLogFile): string {
    const serverlogPath = `${this.folder}/${id}/log`;
    return fs.readFileSync(serverlogPath).toString('utf8');
  }

  public killItWithFire(): void {
    // Stop all spawned servers
    // remove everything in workspace
  }
}
