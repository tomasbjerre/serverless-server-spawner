import fs from 'fs';
import fsextra from 'fs-extra';
import path from 'path';
import { Server, ServerId, ServerLogFile, ProcessId } from './Model';
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

  public getServerState(id: ServerId): ServerLogFile | 'nopid' {
    for (let kind of ['run', 'prepare', 'clone', 'spawn'] as ServerLogFile[]) {
      if (this.getServerPid(id, kind) != -1) {
        return kind;
      }
    }
    return 'nopid';
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
    if (fs.existsSync(serverlogPath)) {
      return fs.readFileSync(serverlogPath).toString('utf8');
    }
    return '';
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
    const serverFolder = path.join(this.folder, id);
    fsextra.emptyDirSync(serverFolder);
  }

  public findOrCreateServer(
    cloneUrl: string,
    branch: string,
    minimumSecondsBetweenDispatch: number
  ): ServerId {
    for (let server of this.getServers()) {
      if (server.branch == branch && server.cloneUrl == cloneUrl) {
        const age = (Date.now() - server.startTimestamp) / 1000;
        if (age < minimumSecondsBetweenDispatch) {
          console.log(
            `Using existing server ${server.id} of age ${age} because it is less than ${minimumSecondsBetweenDispatch}.`
          );
          return server.id;
        }
      }
    }
    return this.createServer(cloneUrl, branch);
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
      inactive: undefined,
    };
    console.log(`created ${serverFolder}`);
    const filename = path.join(serverFolder, SERVER_FILE);
    fs.writeFileSync(filename, JSON.stringify(repo, null, 4));
    console.log(`created ${filename}`);
    return serverId;
  }

  public async stopAndRemove(serverId: ServerId) {
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
    this.removeServer(serverId);
  }

  public async stopandremoveallservers() {
    console.log(`Killing any spawned processes in ${this.folder} ...`);
    for (let server of this.getServers()) {
      await this.stopAndRemove(server.id);
    }
    console.log(`Emptying ${this.folder} ...`);
    fsextra.emptyDirSync(this.folder);
    console.log(`Emptying done`);
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
