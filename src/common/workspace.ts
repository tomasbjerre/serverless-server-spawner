import fs from 'fs';
import path from 'path';
import { Server, ServerId, ServerLogFile, ProcessId } from './Model';
import { randomUUID, validateUuid } from './common';

const SERVER_FILE = 'server.json';
const REPO_FOLDER = 'repo';

export class Workspace {
  constructor(private folder: string) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
  }

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
      .filter((it) => fs.existsSync(it))
      .map((it) => fs.readFileSync(it, 'utf-8'))
      .map((it) => JSON.parse(it) as Server);
  }

  public getServerState(id: ServerId): ServerLogFile | undefined {
    if (this.getServerPid(id, 'clone')) return 'clone';
    if (this.getServerPid(id, 'spawn')) return 'spawn';
    if (this.getServerPid(id, 'run')) return 'run';
    return undefined;
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

  public getServerLogFile(id: ServerId, kind: ServerLogFile): string {
    return path.join(this.folder, id, kind);
  }

  public getServerLog(id: ServerId, kind: ServerLogFile): string {
    const serverlogPath = this.getServerLogFile(id, kind);
    return fs.readFileSync(serverlogPath).toString('utf8');
  }

  public getServerPidFile(id: ServerId, kind: ServerLogFile) {
    return path.join(this.folder, id, `${kind}.pid`);
  }

  public getServerPid(id: ServerId, kind: ServerLogFile): ProcessId {
    const pidFile = this.getServerPidFile(id, kind);
    if (fs.existsSync(pidFile)) {
      return parseInt(fs.readFileSync(pidFile, 'utf8'));
    }
    return -1;
  }

  public removeServer(id: ServerId): void {
    const server = this.getServer(id);
    const serverFolder = path.join(this.folder, server.id);
    fs.unlinkSync(serverFolder);
  }

  private createServer(cloneUrl: string, branch: string): ServerId {
    const serverId = randomUUID();
    const serverFolder = path.join(this.folder, serverId);
    fs.mkdirSync(serverFolder);
    const repo: Server = {
      cloneUrl,
      branch,
      id: serverId,
      name: undefined,
    };
    console.log(`created ${serverFolder}`);
    const filename = path.join(serverFolder, SERVER_FILE);
    fs.writeFileSync(filename, JSON.stringify(repo, null, 4));
    console.log(`created ${filename}`);
    return serverId;
  }
}
