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
console.info(`removing ${serverFolder}...`);
fsextra.emptyDirSync(serverFolder);
fsextra.removeSync(serverFolder);
console.info(`done removing ${serverFolder}`);
