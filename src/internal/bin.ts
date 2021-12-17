#!/usr/bin/env node

import fs from 'fs';
import fsextra from 'fs-extra';
import path from 'path';
const portastic = require('portastic');
import { Command, Option } from 'commander';
import { getMatched } from '../common/common';
import { Workspace } from '../common/workspace';
import { Server } from '../common/Model';
import { spawnProcess } from '../common/process';
import { SIGILL } from 'constants';
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
const timeToLive = parseInt(program.opts().timeToLive);
const matchersFolder = program.opts().matchersFolder;
const minimumPortNumber = parseInt(program.opts().minimumPortNumber);
const maximumPortNumber = parseInt(program.opts().maximumPortNumber);

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
    console.log(
      `Cloned ${serverToSpawn.cloneUrl} ${serverToSpawn.branch} to ${cloneFolder}`
    );
    if (code !== 0) {
      eventEmitter.emit('error');
    }
    eventEmitter.emit('success');
  });
}

function getGitRevision(folder: string): string {
  try {
    return execSync(`git rev-parse HEAD -C "${folder}"`).toString().trim();
  } catch (e) {
    console.log(`unable to get git revision in ${folder}`);
    throw e;
  }
}

async function findFreePort(min: number, max: number): Promise<number> {
  const attempts = (max - min) * 2;
  for (let i = 0; i <= attempts; i++) {
    const r = min + Math.round(Math.random() * (max - min));
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
    const oldRevision =
      (fs.existsSync(repoFolder) && getGitRevision(repoFolder)) ||
      'not available';
    const newRevision = getGitRevision(cloneFolder);
    console.log(`New revision of ${cloneFolder} is ${newRevision}`);
    if (oldRevision != newRevision) {
      console.log(
        `Old revision of ${repoFolder} was ${oldRevision}, replacing it with new code.`
      );
      if (fs.existsSync(repoFolder)) {
        fsextra.removeSync(repoFolder);
      }
      fs.renameSync(cloneFolder, repoFolder);
    }
    const matched = getMatched(matchersFolder, repoFolder);
    const portNumber = await findFreePort(minimumPortNumber, maximumPortNumber);
    console.log(`Using port ${portNumber}`);
    const opts = { env: { ...process.env, PORT: portNumber } };

    const prepareServerProcess = workspace.spawnServerCommand(
      serverId,
      'prepare',
      repoFolder,
      matched.prepareCommand,
      opts
    );
    prepareServerProcess.on('close', () => {
      console.log(`Preparation done with '${matched.prepareCommand}'`);
      eventEmitter.emit('success');
    });

    eventEmitter.once('success', async () => {
      const spawnedServerProcess = workspace.spawnServerCommand(
        serverId,
        'run',
        repoFolder,
        matched.startCommand,
        opts
      );

      const serverFile = workspace.getServerFile(serverId);
      serverToSpawn.name = matched.name;
      serverToSpawn.port = portNumber;
      fs.writeFileSync(serverFile, JSON.stringify(serverToSpawn, null, 4));
      console.log(
        `Will kill '${serverToSpawn.name}' with pid ${spawnedServerProcess.pid} after ${timeToLive} minutes`
      );
      setTimeout(() => {
        console.log(
          `Killing spawned server ${spawnedServerProcess.pid} after ${timeToLive} minutes`
        );
        process.exit();
      }, timeToLive * 60 * 1000);
    });
  });
}
