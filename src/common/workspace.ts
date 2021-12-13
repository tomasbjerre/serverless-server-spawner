import fs from 'fs';
import path from 'path';
import { Server, ServerId, ServerLogFile } from './Model';
import { randomUUID, validateUuid } from './common';

const SERVER_FILE = 'server.json';
const REPO_FOLDER = 'repo';
const SPAWN_LOG = 'spawn.log';

export class Workspace {
  constructor(private folder: string) {}

  public getOrCreate(cloneUrl: string, branch: string): ServerId {
    const found = this.getServers().find(
      (it) => it.branch == branch && it.cloneUrl == cloneUrl
    );
    if (found) {
      return found.id;
    } else {
      return this.createServer(cloneUrl, branch);
    }
  }

  public getServers(): Server[] {
    return fs
      .readdirSync(this.folder)
      .filter((it) => validateUuid(it))
      .map((it) => path.join(this.folder, it, SERVER_FILE))
      .map((it) => fs.readFileSync(it, 'utf-8'))
      .map((it) => JSON.parse(it) as Server);
  }

  public getServer(id: ServerId): Server {
    const found = this.getServers().find((it) => it.id == id);
    if (found) {
      return found;
    }
    throw `${id} not found`;
  }

  public getServerRepoFolder(id: ServerId): string {
    return path.join(this.folder, id, REPO_FOLDER);
  }

  public getServerTemporaryFolder(id: ServerId): string {
    return path.join(this.folder, id, randomUUID());
  }

  public getServerFile(id: ServerId): string {
    return path.join(this.folder, id, SERVER_FILE);
  }

  public getServerLogContent(id: ServerId, file: ServerLogFile): string {
    const serverlogPath = path.join(this.folder, id, file);
    return fs.readFileSync(serverlogPath).toString('utf8');
  }

  public removeServer(id: ServerId): void {
    const server = this.getServer(id);
    const serverFolder = path.join(this.folder, server.id);
    fs.unlinkSync(serverFolder);
  }

  public getServerSpawnLog(id: ServerId) {
    return path.join(this.folder, id, SPAWN_LOG);
  }

  private createServer(cloneUrl: string, branch: string): ServerId {
    const serverId = randomUUID();
    const serverFolder = path.join(this.folder, serverId);
    fs.mkdirSync(serverFolder);
    const repo: Server = {
      cloneUrl,
      branch,
      id: serverId,
      status: 'CREATED',
      pid: undefined,
      name: undefined,
    };
    fs.writeFileSync(path.join(serverFolder, SERVER_FILE), repo);
    return serverId;
  }
}
