#!/usr/bin/env node

import path from 'path';
import { Command } from 'commander';
import fsextra from 'fs-extra';
const pkgJson = require(path.join(__dirname, '..', '..', 'package.json'));

const program = new Command()
  .version(pkgJson.version)
  .option('-ws, --workspace <folder>')
  .option('-s, --server <id>');
program.parse(process.argv);

const serverFolder = path.join(program.opts().workspace, program.opts().server);
const garbageFolder = path.join(
  program.opts().workspace,
  `removing-${program.opts().server}`
);
console.info(`removing ${serverFolder}...`);
fsextra.renameSync(serverFolder, garbageFolder);
fsextra.emptyDirSync(garbageFolder);
fsextra.removeSync(garbageFolder);
console.info(`done removing ${serverFolder}`);
