#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
const portastic = require('portastic');
import { Command, Option } from 'commander';
import { getMatched } from '../common/common';
import { Workspace } from '../common/workspace';
import { Server } from '../common/Model';
import { spawnProcess } from '../common/process';
import { SIGTERM } from 'constants';
const pkgJson = require(path.join(__dirname, '..', '..', 'package.json'));
const { execSync } = require('child_process');
const events = require('events');

const program = new Command()
  .version(pkgJson.version)
  .option('-ws, --workspace <folder>')
  .option('-s, --server <id>')
  .option('-t, --matchers-folder <folder>', 'Folder containing matchers.')
  .option(
    '-ttl, --time-to-live <minutes>',
    'Time to keep server running after it was started.',
    '600'
  )
  .addOption(
    new Option('-t, --task <task>', 'task to perform').choices(['spawn'])
  )
  .option(
    '-mip, --minimum-port-number <port>',
    'Minimum port number to use for spawned servers',
    '9000'
  )
  .option(
    '-map, --maximum-port-number <port>',
    'Maximum port number to use for spawned servers',
    '9999'
  );
program.parse(process.argv);

const eventEmitter = new events.EventEmitter();
const serverDir = path.join(program.opts().workspace, program.opts().server);
const workspace = new Workspace(program.opts().workspace);
const timeToLive = program.opts().timeToLive;
const matchersFolder = program.opts().matchersFolder;
const minimumPortNumber = program.opts().minimumPortNumber;
const maximumPortNumber = program.opts().maximumPortNumber;

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
    workspace.getServerLogFile(serverToSpawn.id, 'clone'),
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

function spawnServer(
  serverId: string,
  folder: string,
  startCommand: string,
  port: number
): any {
  const logFile = workspace.getServerLogFile(serverId, 'run');
  const pidFile = workspace.getServerPidFile(serverId, 'run');
  return spawnProcess(startCommand, [], logFile, pidFile, {
    shell: true,
    cwd: folder,
    env: { ...process.env, PORT: port },
  });
}

async function findFreePort(min: number, max: number): Promise<number> {
  const attempts = (max - min) * 2;
  for (let i = 0; i <= attempts; i++) {
    const r = Math.random() * (max - min) + min;
    const available = await portastic.test(r);
    if (available) {
      return r;
    }
  }
  throw `No available ports between ${min} and ${max}`;
}

if (program.opts().task == 'spawn') {
  const serverId = program.opts().server;
  const serverToSpawn = workspace.getServer(serverId);

  const cloneFolder = workspace.getServerTemporaryFolder(serverId);
  const repoFolder = workspace.getServerRepoFolder(serverId);
  cloneRepo(cloneFolder, serverToSpawn);

  eventEmitter.once('success', async () => {
    if (fs.existsSync(repoFolder)) {
      const oldRevision = getGitRevision(repoFolder);
      const newRevision = getGitRevision(cloneFolder);
      if (oldRevision != newRevision) {
        fs.unlinkSync(repoFolder);
        fs.renameSync(cloneFolder, repoFolder);
      }
    }
    const matched = getMatched(matchersFolder, repoFolder);
    const portNumber = await findFreePort(minimumPortNumber, maximumPortNumber);
    const spawnedServerProcess = spawnServer(
      serverId,
      cloneFolder,
      matched.startCommand,
      portNumber
    );
    const serverFile = workspace.getServerFile(serverId);
    serverToSpawn.name = matched.name;
    fs.writeFileSync(serverFile, JSON.stringify(serverToSpawn, null, 4));
    eventEmitter.once('success', () => {
      fs.writeFileSync(serverFile, JSON.stringify(serverToSpawn, null, 4));
      setTimeout(() => {
        console.log(
          `Killing spawned server ${spawnedServerProcess.pid} after ${timeToLive} minutes`
        );
        process.kill(spawnedServerProcess.pid, SIGTERM);
      }, timeToLive * 60 * 1000);
    });
  });
}
