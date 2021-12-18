import fs from 'fs';
import fsextra from 'fs-extra';
import path from 'path';
import {
  Server,
  ServerId,
  ServerLogFile,
  ProcessId,
  ServerSettings,
} from './Model';
import { randomUUID, validateUuid } from './common';
import { processExists, shutdownProcess, spawnProcess } from './process';

const SERVER_FILE = 'server.json';
const REPO_FOLDER = 'repo';

export class Workspace {
  constructor(private folder: string, private timeToLive: number) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
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

  public getServerState(id: ServerId): ServerLogFile | 'stop' {
    for (let kind of ['run', 'prepare', 'clone', 'spawn'] as ServerLogFile[]) {
      if (this.getServerPid(id, kind) != -1) {
        return kind;
      }
    }
    return 'stop';
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

  public getServerFile(id: ServerId): string {
    return path.join(this.folder, id, SERVER_FILE);
  }

  public getServerLogFile(id: ServerId, kind: ServerLogFile): string {
    return path.join(this.folder, id, `${kind}.log`);
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
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
      if (processExists(pid)) {
        return pid;
      }
    }
    return -1;
  }

  public removeServer(id: ServerId): void {
    const server = this.getServer(id);
    const serverFolder = path.join(this.folder, server.id);
    fs.unlinkSync(serverFolder);
  }

  public removeAll() {
    fsextra.emptyDirSync(this.folder);
  }

  public createServer(cloneUrl: string, branch: string): ServerId {
    const serverId = randomUUID();
    const serverFolder = path.join(this.folder, serverId);
    fs.mkdirSync(serverFolder);
    const repo: Server = {
      cloneUrl,
      branch,
      id: serverId,
      name: undefined,
      port: undefined,
      endTimestamp: Date.now() + this.timeToLive * 60 * 1000,
      startTimestamp: Date.now(),
      revision: undefined,
    };
    console.log(`created ${serverFolder}`);
    const filename = path.join(serverFolder, SERVER_FILE);
    fs.writeFileSync(filename, JSON.stringify(repo, null, 4));
    console.log(`created ${filename}`);
    return serverId;
  }

  public async stopServer(serverId: ServerId) {
    console.log(`stopping server ${serverId}`);
    for (let state of ['run', 'prepare', 'spawn', 'clone'] as ServerLogFile[]) {
      const pid = this.getServerPid(serverId, state);
      if (pid != -1) {
        console.log(`killing ${serverId} ${state} ${pid}`);
        try {
          shutdownProcess(pid);
        } catch (e) {
          console.log(`Was unable to kill ${pid}`, e);
        }
      }
    }
  }

  public async killitwithfire() {
    console.log(`Killing any spawned processes in ${this.folder} ...`);
    for (let server of this.getServers()) {
      await this.stopServer(server.id);
    }
    console.log(`Emptying ${this.folder} ...`);
    this.removeAll();
  }

  public spawnServerCommand(
    serverId: string,
    kind: ServerLogFile,
    folder: string,
    command: string,
    opts: any
  ): any {
    const logFile = this.getServerLogFile(serverId, kind);
    const pidFile = this.getServerPidFile(serverId, kind);
    const allOpts = {
      shell: true,
      cwd: folder,
      ...opts,
    };
    return spawnProcess(command, [], logFile, pidFile, allOpts);
  }
}
