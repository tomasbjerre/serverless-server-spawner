#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Command, Option } from 'commander';
import { randomUUID, getMatched } from '../common/common';
import { Workspace, REPO_FOLDER, SERVER_FILE } from '../common/workspace';
import { ServerLogFile, Server } from '../common/Model';
const pkgJson = require('../package.json');
const { spawn, execSync } = require('child_process');
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

function cloneRepo(cloneFolder: string, serverToSpawn: Server) {
  const cloneLogFile = fs.createWriteStream(
    path.join(serverDir, 'clone' as ServerLogFile)
  );
  const command = spawn(
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
    { cwd: serverDir }
  );
  command.stdout.pipe(cloneLogFile);
  command.stderr.pipe(cloneLogFile);
  command.on('close', (code: number) => {
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
  return -1;
}

if (program.opts().task == 'spawn') {
  const workspace = new Workspace(program.opts().workspace);
  const serverToSpawn = workspace.getServer(program.opts().server);

  const cloneFolder = path.join(serverDir, randomUUID());
  const repoFolder = path.join(serverDir, REPO_FOLDER);
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
    const serverFile = path.join(serverDir, SERVER_FILE);
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
