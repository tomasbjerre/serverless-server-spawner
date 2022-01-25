#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
const portastic = require('portastic');
import { Command, Option } from 'commander';
import { getMatched, getGitRevision } from '../common/common';
import { Workspace } from '../common/workspace';
import { Server } from '../common/Model';
import { spawnProcess } from '../common/process';
const pkgJson = require(path.join(__dirname, '..', '..', 'package.json'));
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
const workspace = new Workspace(
  program.opts().workspace,
  program.opts().timeToLive
);
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
  const repoFolder = workspace.getServerRepoFolder(serverId);

  cloneRepo(repoFolder, serverToSpawn);

  setTimeout(() => {
    console.log(
      `Killing spawned server ${process.pid} after ${timeToLive} minutes`
    );
    workspace.removeServer(serverId);
    process.exit();
  }, timeToLive * 60 * 1000);

  eventEmitter.once('success', async () => {
    const revision = getGitRevision(repoFolder);
    console.log(`Revision of '${repoFolder}' is '${revision}'`);
    const matched = getMatched(matchersFolder, repoFolder);

    const serverFile = workspace.getServerFile(serverId);
    serverToSpawn.name = matched.name;
    serverToSpawn.revision = revision;
    fs.writeFileSync(serverFile, JSON.stringify(serverToSpawn, null, 4));

    const prepareServerProcess = workspace.spawnServerCommand(
      serverId,
      'prepare',
      repoFolder,
      matched.prepareCommand,
      { env: { ...process.env } }
    );
    prepareServerProcess.on('close', () => {
      console.log(`Preparation done with '${matched.prepareCommand}'`);
      eventEmitter.emit('success');
    });
    prepareServerProcess.on('error', function (err: any) {
      console.log(`Error with ${matched.prepareCommand} in ${repoFolder}`, err);
      const serverFile = workspace.getServerFile(serverId);
      serverToSpawn.inactive = true;
      fs.writeFileSync(serverFile, JSON.stringify(serverToSpawn, null, 4));
    });

    eventEmitter.once('success', async () => {
      const portNumber = await findFreePort(
        minimumPortNumber,
        maximumPortNumber
      );
      console.log(`Using port ${portNumber}`);
      const env = { ...process.env, PORT: portNumber, HTTP_PORT: portNumber };
      matched.preStart(repoFolder, env);
      const spawnedServerProcess = workspace.spawnServerCommand(
        serverId,
        'run',
        repoFolder,
        matched.startCommand,
        { env }
      );
      spawnedServerProcess.on('error', function (err: any) {
        console.log(`Error with ${matched.startCommand} in ${repoFolder}`, err);
        const serverFile = workspace.getServerFile(serverId);
        serverToSpawn.inactive = true;
        fs.writeFileSync(serverFile, JSON.stringify(serverToSpawn, null, 4));
      });

      const serverFile = workspace.getServerFile(serverId);
      serverToSpawn.port = portNumber;
      fs.writeFileSync(serverFile, JSON.stringify(serverToSpawn, null, 4));

      console.log(
        `Will kill '${serverToSpawn.name}' with pid ${process.pid} after ${timeToLive} minutes`
      );
    });
  });
}
