#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Command, Option } from 'commander';
import { getMatched } from '../common/common';
import { Workspace } from '../common/workspace';
import { Server } from '../common/Model';
import { spawnProcess } from '../common/process';
const pkgJson = require('../package.json');
const { execSync } = require('child_process');
const events = require('events');

const program = new Command()
  .version(pkgJson.version)
  .option('-ws, --workspace <folder>')
  .option('-s, --server <id>')
  .option('-mf, --matchers-folder <folder>', 'Folder containing matchers.')
  .addOption(
    new Option('-t, --task <task>', 'task to perform').choices(['spawn'])
  );
program.parse(process.argv);

const eventEmitter = new events.EventEmitter();
const serverDir = path.join(program.opts().workspace, program.opts().server);
const workspace = new Workspace(program.opts().workspace);

function cloneRepo(cloneFolder: string, serverToSpawn: Server) {
  const p = spawnProcess(
    'git',
    [
      'clone',
      serverToSpawn.cloneUrl,
      '-b',
      serverToSpawn.branch,
      '--depth',
      '1',
      cloneFolder,
    ],
    workspace.getServerLog(serverToSpawn.id, 'clone'),
    workspace.getServerPidFile(serverToSpawn.id, 'clone'),
    { cwd: serverDir }
  );
  p.on('close', (code: number) => {
    if (code !== 0) {
      eventEmitter.emit('error');
    }
    eventEmitter.emit('success');
  });
}

function getGitRevision(folder: string): string {
  return execSync('git', ['git', 'rev-parse', 'HEAD'], { cwd: folder });
}

function spawnServer(folder: string, startCommand: string): number {
  return -1; //TODO
}

if (program.opts().task == 'spawn') {
  const serverId = program.opts().server;
  const serverToSpawn = workspace.getServer(serverId);

  const cloneFolder = workspace.getServerTemporaryFolder(serverId);
  const repoFolder = workspace.getServerRepoFolder(serverId);
  cloneRepo(cloneFolder, serverToSpawn);

  eventEmitter.once('success', () => {
    if (fs.existsSync(repoFolder)) {
      const oldRevision = getGitRevision(repoFolder);
      const newRevision = getGitRevision(cloneFolder);
      if (oldRevision != newRevision) {
        fs.unlinkSync(repoFolder);
        fs.renameSync(cloneFolder, repoFolder);
      }
    }
    const matched = getMatched(repoFolder);
    const pid = spawnServer(cloneFolder, matched.startCommand);
    const serverFile = workspace.getServerFile(serverId);
    serverToSpawn.pid = pid;
    serverToSpawn.name = matched.name;
    serverToSpawn.status = 'STARTING';
    fs.writeFileSync(serverFile, JSON.stringify(serverToSpawn, null, 4));
    eventEmitter.once('success', () => {
      serverToSpawn.status = 'STARTED';
      fs.writeFileSync(serverFile, JSON.stringify(serverToSpawn, null, 4));
    });
  });
}
