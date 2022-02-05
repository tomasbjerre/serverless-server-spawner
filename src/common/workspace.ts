import fs from 'fs';
import fsextra from 'fs-extra';
import path from 'path';
import {
  Server,
  ServerId,
  ServerLogFile,
  ProcessId,
  ServerState,
} from './Model';
import { randomUUID, validateUuid, getMatched } from './common';
import { processExists, spawnProcess } from './process';
import NodeCache from 'node-cache';
var kill = require('tree-kill');
const portastic = require('portastic');

const SERVER_FILE = 'server.json';
const REPO_FOLDER = 'repo';

export class Workspace {
  constructor(
    private folder: string,
    private timeToLive: number,
    private matchersFolder: string,
    private timeToLiveCache: NodeCache | undefined = undefined
  ) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
  }

  /**
   * Keep memory-cache of when servers are ended. To avoid
   * FS interaction on ended servers, causing locks on Windows.
   */
  private isEnded(serverId: ServerId): boolean {
    if (!this.timeToLiveCache) {
      return false;
    }
    const endTime = this.timeToLiveCache.has(serverId)
      ? (this.timeToLiveCache.get(serverId) as number) || 0
      : 0;
    return endTime < Date.now();
  }

  private setEndTimestamp(serverId: ServerId, endTimestamp: number): void {
    if (this.timeToLiveCache) {
      this.timeToLiveCache.set(serverId, endTimestamp);
    }
  }

  public getServers(): Server[] {
    return fs
      .readdirSync(this.folder)
      .filter((it) => validateUuid(it))
      .filter((it) => !this.isEnded(it))
      .map((it) => path.join(this.folder, it, SERVER_FILE))
      .filter((it) => fs.existsSync(it))
      .map((it) => fs.readFileSync(it, 'utf-8'))
      .map((it) => JSON.parse(it) as Server)
      .map((it) => ({ ...it, state: this.getServerState(it.id) }))
      .map((it) => ({ ...it, ready: this.isReady(it) }))
      .sort((a, b) => `${a.name}-${a.id}`.localeCompare(`${b.name}-${b.id}`));
  }

  public getServerState(id: ServerId): ServerState {
    for (let kind of ['run', 'prepare', 'clone', 'spawn'] as ServerLogFile[]) {
      if (this.getServerPid(id, kind) != -1) {
        return kind;
      }
    }
    return 'nopid';
  }

  public isReady(server: Server): boolean {
    if (this.isEnded(server.id)) {
      console.log(`ended server ${server.id} not ready`);
      return false;
    }
    const repoFolder = this.getServerRepoFolder(server.id);
    if (server.state == 'run') {
      const matched = getMatched(this.matchersFolder, repoFolder);
      const runLogContent = this.getServerLog(server.id, 'run');
      return matched.isReady(runLogContent, server.port);
    }
    return false;
  }

  public findServer(id: ServerId): Server | undefined {
    return this.getServers().find((it) => it.id == id);
  }

  public getServer(id: ServerId): Server {
    const found = this.findServer(id);
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
    if (this.isEnded(id)) {
      console.log(`ended server ${id} empty log`);
      return '';
    }
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
    if (this.isEnded(id)) {
      console.log(`ended server ${id} no pid`);
      return -1;
    }
    const pidFile = this.getServerPidFile(id, kind);
    if (fs.existsSync(pidFile)) {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
      if (processExists(pid)) {
        return pid;
      }
    }
    return -1;
  }

  public findServerByCloneUrlAndBranch(
    cloneUrl: string,
    branch: string,
    minimumSecondsBetweenDispatch: number
  ): ServerId | undefined {
    for (let server of this.getServers()) {
      if (server.branch == branch && server.cloneUrl == cloneUrl) {
        const age = (Date.now() - server.startTimestamp) / 1000;
        if (age < minimumSecondsBetweenDispatch) {
          console.log(
            `Using existing server ${server.id} of age ${age} because it is less than ${minimumSecondsBetweenDispatch} minutes old.`
          );
          return server.id;
        }
      }
    }
    return undefined;
  }

  public createServer(cloneUrl: string, branch: string): ServerId {
    const serverId = randomUUID();
    const serverFolder = path.join(this.folder, serverId);
    const endTimestamp = Date.now() + this.timeToLive * 60 * 1000;
    fs.mkdirSync(serverFolder);
    const repo: Server = {
      cloneUrl,
      branch,
      id: serverId,
      name: '',
      port: undefined,
      endTimestamp,
      startTimestamp: Date.now(),
      revision: undefined,
      error: false,
      state: this.getServerState(serverId),
      ready: false,
    };
    console.log(`created ${serverFolder}`);
    const filename = path.join(serverFolder, SERVER_FILE);
    fs.writeFileSync(filename, JSON.stringify(repo, null, 4));
    console.log(`created ${filename}`);
    this.setEndTimestamp(serverId, endTimestamp);
    return serverId;
  }

  public stopServer(serverId: ServerId) {
    if (this.isEnded(serverId)) {
      console.log(`Not stopping ended server ${serverId}`);
      return;
    }
    console.log(`stopping server ${serverId}`);
    for (let state of ['run', 'prepare', 'spawn', 'clone'] as ServerLogFile[]) {
      const pid = this.getServerPid(serverId, state);
      if (pid != -1) {
        console.log(`killing ${serverId} ${state} ${pid}`);
        try {
          kill(pid);
        } catch (e) {
          console.log(`Was unable to kill ${pid}`, e);
        }
        return; // the killing will result in the others being exited
      }
    }
  }

  public stopAllServers() {
    console.log(`Killing any spawned processes in ${this.folder} ...`);
    for (let server of this.getServers()) {
      this.stopServer(server.id);
    }
  }

  public removeWorkspace() {
    console.log(`Emptying ${this.folder} ...`);
    fsextra.emptyDirSync(this.folder);
    console.log(`Emptying done`);
  }

  public spawnServerCommand(
    serverId: string,
    kind: ServerLogFile,
    folder: string,
    command: string,
    opts: any,
    pipeStderr: boolean = false
  ): any {
    const logFile = this.getServerLogFile(serverId, kind);
    const pidFile = this.getServerPidFile(serverId, kind);
    const allOpts = {
      shell: true,
      cwd: folder,
      ...opts,
    };
    return spawnProcess(command, [], logFile, pidFile, allOpts, pipeStderr);
  }

  public hasAvailablePorts(minPort: number, maxPort: number): boolean {
    return (
      this.getServers().filter((it) => !it.error).length < maxPort - minPort
    );
  }

  public async findFreePort(min: number, max: number): Promise<number> {
    const scope = max - min;
    const attempts = scope * 2;
    let randomPortInScope = Math.round(Math.random() * (max - min + 1));
    for (let i = 0; i <= attempts; i++) {
      const candidatePort = min + (randomPortInScope++ % scope);
      console.log(`Trying to acquire port ${candidatePort}`);
      const available = await portastic.test(candidatePort);
      if (available) {
        const takenByOtherServer = this.getServers().find(
          (it) => it.port == candidatePort
        );
        if (takenByOtherServer) {
          // console.log(`Port ${candidatePort} will be used by other server ${takenByOtherServer.id}`);
        } else {
          // console.log(`Found free port ${candidatePort}`);
          return candidatePort;
        }
      } else {
        // console.log(`Port ${candidatePort} is used`);
      }
    }
    throw `No available ports between ${min} and ${max}`;
  }
}
