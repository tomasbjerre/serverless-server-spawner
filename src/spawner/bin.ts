#!/usr/bin/env node

import { updateReadme } from './updateReadme';
import { run } from './server';
import { Command } from 'commander';
import { BitbucketServer } from '../common/Model';
const figlet = require('figlet');
const pkgJson = require('../../package.json');

console.log(
  figlet.textSync('Serverless\n Server\n  Spawner', {
    horizontalLayout: 'full',
  })
);

function commaSeparatedList(value: string) {
  return value.split(',');
}

const program = new Command()
  .version(pkgJson.version)
  .command(pkgJson.name)
  .option('-ws, --workspace <folder>', 'Filesystem to work with.')
  .option('-mf, --matchers-folder <folder>', 'Folder containing matchers.')
  .option('-p, --port <number>', 'Server port to use', '8080')
  .option(
    '-d, --dashboard-url <url>',
    'Base URL of dashboard',
    'http://localhost:8080'
  )
  .option(
    '-ttl, --time-to-live <minutes>',
    'Time to keep server running after it was started.',
    '30'
  )
  .option(
    '-bbsat, --bitbucket-server-access-token <token>',
    'Bitbucket Server access token'
  )
  .option(
    '-bbsu, --bitbucket-server-url <url>',
    'Bitbucket Server to use for REST integration (https://bbs/rest/api/latest)'
  )
  .option(
    '-bbsp, --bitbucket-server-projects <projects>',
    'Bitbucket Server projects. Empty will include all projects.',
    commaSeparatedList
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
  )
  .option(
    '-ict, --integration-cache-ttl <minutes>',
    'Cache time to live, seconds',
    '120'
  )
  .option(
    '-nc, --no-cleanup',
    'Do not cleanup state on startup: kill servers and clean workspace'
  )
  .option(
    '-msbd, --minimum-seconds-between-dispatch <seconds>',
    'Minimum time between spawning new servers from same url and branch',
    '10'
  );

updateReadme(program);

program.parse(process.argv);
const port = program.opts().port;
const dashboardUrl = program.opts().dashboardUrl;
const workspace =
  program.opts().workspace ||
  process.cwd() + '/serverless-server-spawner-workspace';
const matchersFolder = program.opts().matchersFolder;
const timeToLive = program.opts().timeToLive;
const bitbucketServerAccessToken = program.opts().bitbucketServerAccessToken;
const bitbucketServerUrl = program.opts().bitbucketServerUrl;
const bitbucketServerProjects = program.opts().bitbucketServerProjects;
const integrationCacheTtl = program.opts().integrationCacheTtl;
const minimumPortNumber = program.opts().minimumPortNumber;
const maximumPortNumber = program.opts().maximumPortNumber;
const cleanup = program.opts().cleanup;
const bitbucketServer = bitbucketServerUrl
  ? ({
      url: bitbucketServerUrl,
      personalAccessToken: bitbucketServerAccessToken,
      projects: bitbucketServerProjects || [],
    } as BitbucketServer)
  : undefined;
const minimumSecondsBetweenDispatch =
  program.opts().minimumSecondsBetweenDispatch;
console.log(`
 port: ${port}
 dashboardUrl: ${dashboardUrl}
 workspace: ${workspace}
 matchersFolder: ${matchersFolder}
 timeToLive: ${timeToLive}
 bitbucketServer: ${bitbucketServer ? 'configured' : 'not configured'}
 integrationCacheTtl: ${integrationCacheTtl}
 minimumPortNumber: ${minimumPortNumber}
 maximumPortNumber: ${maximumPortNumber}
 cleanup: ${cleanup}
 minimumSecondsBetweenDispatch: ${minimumSecondsBetweenDispatch}

 http://localhost:${port}
`);
run({
  port,
  workspace,
  dashboardUrl,
  matchersFolder,
  timeToLive,
  gitService: {
    bitbucketServer,
  },
  integrationCacheTtl,
  minimumPortNumber,
  maximumPortNumber,
  cleanup,
  minimumSecondsBetweenDispatch,
});
