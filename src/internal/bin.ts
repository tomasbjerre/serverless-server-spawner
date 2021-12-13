#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Command, Option } from 'commander';
import { randomUUID } from '../common/common';
import { Workspace } from '../common/workspace';
import { ServerLogFile } from '../common/Model';
const pkgJson = require('../package.json');
const { spawn } = require('child_process');
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

if (program.opts().task == 'spawn') {
  const workspace = new Workspace(program.opts().workspace);
  const serverToSpawn = workspace.getServer(program.opts().server);
  const cloneFolder = path.join(serverDir, randomUUID());
  const cloneLogFile = fs.createWriteStream(
    path.join(serverDir, 'clone' as ServerLogFile)
  );
  const command = spawn(
    'git',
    ['clone', serverToSpawn.cloneUrl, '-b', serverToSpawn.branch, cloneFolder],
    { cwd: serverDir }
  );
  command.stdout.pipe(cloneLogFile);
  command.stderr.pipe(cloneLogFile);
  command.on('close', (code: number) => {
    if (code !== 0) {
      throw `Clone failed`;
    }
    eventEmitter.emit('finished');
  });
  eventEmitter.on('finished', () => {
    // Check if branch up to date with any prev build, read config and return
    // Find a fitting matcher
    // Derive name and start command with matcher
    // Save details in workspace/identity
    // Spawn server
  });
}
