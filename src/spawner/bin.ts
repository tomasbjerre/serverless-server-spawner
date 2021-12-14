#!/usr/bin/env node

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
  .option('-ws, --workspace <folder>', 'Filesystem to work with.')
  .option('-mf, --matchers-folder <folder>', 'Folder containing matchers.')
  .option('-p, --port <number>', 'Server port to use', '8080')
  .option(
    '-d, --dashboardUrl <url>',
    'Base URL of dashboard',
    'http://localhost'
  )
  .option(
    '-ttl, --time-to-live <minutes>',
    'Time to keep server running after it was started.',
    '600'
  )
  .option(
    '-bbsat, --bitbucket-server-access-token <token>',
    'Bitbucket Server access token'
  )
  .option(
    '-bbsu, --bitbucket-server-url <url>',
    'Bitbucket Server base URL to use for REST integration'
  )
  .option(
    '-bbsp, --bitbucket-server-projects <projects>',
    'Bitbucket Server projects',
    commaSeparatedList
  );
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
const bitbucketServer = bitbucketServerAccessToken
  ? ({
      url: bitbucketServerUrl,
      personalAccessToken: bitbucketServerAccessToken,
      projects: bitbucketServerProjects,
    } as BitbucketServer)
  : undefined;
console.log(`
 port: ${port}
 dashboardUrl: ${dashboardUrl}
 workspace: ${workspace}
 matchersFolder: ${matchersFolder}
 timeToLive: ${timeToLive}
 bitbucketServer: ${bitbucketServer}
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
});
