#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Command, Option } from 'commander';
import { getMatched, getGitRevision } from '../common/common';
import { Workspace } from '../common/workspace';
import { Server } from '../common/Model';
import { spawnProcess } from '../common/process';
const pkgJson = require(path.join(__dirname, '..', '..', 'package.json'));
const events = require('events');
var kill = require('tree-kill');

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
  program.opts().timeToLive,
  program.opts().matchersFolder
);
const timeToLive = parseInt(program.opts().timeToLive);
const timeToDie = Date.now() + timeToLive * 60 * 1000;
const matchersFolder = program.opts().matchersFolder;
const minimumPortNumber = parseInt(program.opts().minimumPortNumber);
const maximumPortNumber = parseInt(program.opts().maximumPortNumber);

function timeLeft() {
  const millisLeft = timeToDie - Date.now();
  if (millisLeft > 0) {
    return millisLeft;
  }
  return 0;
}

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
      throw `Unable to clone ${serverToSpawn.cloneUrl}`;
    }
    eventEmitter.emit('success');
  });
}

if (program.opts().task == 'spawn') {
  const serverId = program.opts().server;
  const serverToSpawn = workspace.getServer(serverId);
  const repoFolder = workspace.getServerRepoFolder(serverId);

  process.on('uncaughtException', function (err) {
    serverToSpawn.error = true;
    const serverFile = workspace.getServerFile(serverId);
    fs.writeFileSync(serverFile, JSON.stringify(serverToSpawn, null, 4));
    console.log(
      `Caught an error, will keep logs for ${timeToLive} minutes.`,
      err
    );
    console.log(
      `Keeping ${process.pid} alive for ${timeToLive} minutes, to make logs availble.`
    );
    setTimeout(() => {
      kill(process.pid);
    }, timeLeft());
  });

  process.on('exit', () => {
    console.log(`Exiting spawned process`);
  });

  process.on('SIGTERM', () => {
    console.log(`SIGTERM spawned process`);
  });

  cloneRepo(repoFolder, serverToSpawn);

  eventEmitter.once('success', async () => {
    const revision = getGitRevision(repoFolder);
    console.log(`Revision of '${repoFolder}' is '${revision}'`);
    const matched = getMatched(matchersFolder, repoFolder);

    serverToSpawn.name = matched.name;
    serverToSpawn.revision = revision;
    const serverFile = workspace.getServerFile(serverId);
    fs.writeFileSync(serverFile, JSON.stringify(serverToSpawn, null, 4));

    const prepareServerProcess = workspace.spawnServerCommand(
      serverId,
      'prepare',
      repoFolder,
      matched.prepareCommand,
      { env: { ...process.env } }
    );
    prepareServerProcess.on('close', (code: number) => {
      console.log(`Preparation done with '${matched.prepareCommand}'`);
      if (code !== 0) {
        throw `Error during preparation`;
      }
      eventEmitter.emit('success');
    });

    eventEmitter.once('success', async () => {
      const portNumber = await workspace.findFreePort(
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

      serverToSpawn.port = portNumber;
      const serverFile = workspace.getServerFile(serverId);
      fs.writeFileSync(serverFile, JSON.stringify(serverToSpawn, null, 4));

      console.log(
        `Will kill '${serverToSpawn.name}' with pid ${spawnedServerProcess.pid} after ${timeToLive} minutes`
      );

      const timeout = setTimeout(() => {
        console.log(
          `Killing spawned server ${spawnedServerProcess.pid} after ${timeToLive} minutes`
        );
        kill(spawnedServerProcess.pid, 'SIGKILL', function (err: Error) {
          console.log(err);
        });
      }, timeLeft());

      spawnedServerProcess.on('close', () => {
        console.log(`spawned process closed, cancelling timeout`);
        clearTimeout(timeout);
      });
    });
  });
}
