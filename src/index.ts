#!/usr/bin/env node

import { run } from './server';
import { Command } from 'commander';
const figlet = require('figlet');
const pkgJson = require('../package.json');

console.log(
  figlet.textSync('Serverless\n Server\n  Spawner', {
    horizontalLayout: 'full',
  })
);

const program = new Command()
  .version(pkgJson.version)
  .option('-ws, --workspace <folder>', 'Filesystem to work with.')
  .option('-p, --port <number>', 'Server port to use', '80')
  .option(
    '-d, --dashboardUrl <url>',
    'Base URL of dashboard',
    'http://localhost'
  )
  .option(
    '-ttl, --time-to-live <minutes>',
    'Time to keep server running after it was started.',
    '600'
  );
program.parse(process.argv);

const port = program.opts().port;
const dashboardUrl = program.opts().dashboardUrl;
const workspace =
  program.opts().workspace ||
  process.cwd() + '/serverless-server-spawner-workspace';
console.log(`
 port: ${port}
 dashboardUrl: ${dashboardUrl}
 workspace: ${workspace}
`);
run({
  port,
  workspace,
  dashboardUrl,
});
