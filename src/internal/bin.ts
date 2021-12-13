#!/usr/bin/env node

import fs from 'fs';
import { Command } from 'commander';
import { getServerIdentity } from '../common/common';
const pkgJson = require('../package.json');
const { spawn } = require('child_process');
const events = require('events');

const program = new Command()
  .version(pkgJson.version)
  .option('-ws, --workspace <folder>')
  .option('-ss, --spawn-server <identity>');
program.parse(process.argv);

const workingDir = `${program.opts().workspace}/${program.opts().spawnServer}`;
if (!fs.existsSync(workingDir)) {
  fs.mkdirSync(workingDir);
}

const eventEmitter = new events.EventEmitter();

if (program.opts().spawnServer) {
  const serverToSpawn = getServerIdentity(program.opts().spawnServer);
  const tempfolder = (Math.random() + 1).toString(36).substring(7);
  const stdoutFile = fs.createWriteStream(`${workingDir}/stdout.log`);
  const stderrFile = fs.createWriteStream(`${workingDir}/stderr.log`);
  const command = spawn(
    'git',
    ['clone', serverToSpawn.cloneUrl, '-b', serverToSpawn.branch, tempfolder],
    { cwd: workingDir }
  );
  command.stdout.pipe(stdoutFile);
  command.stderr.pipe(stderrFile);
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
