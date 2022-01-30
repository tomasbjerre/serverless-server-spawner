import { v4 as uuidv4, validate } from 'uuid';
import { Matched, Matcher } from './Model';
import fs from 'fs';
import path from 'path';
const { execSync } = require('child_process');

export function randomUUID() {
  return uuidv4();
}

export function validateUuid(it: string) {
  return validate(it);
}

export function getMatched(
  matchersFolder: string,
  repoFolder: string
): Matched {
  if (!fs.existsSync(repoFolder)) {
    throw `Folder does not exist: ${repoFolder}`;
  }
  if (!fs.existsSync(matchersFolder)) {
    throw `Folder does not exist: ${matchersFolder}`;
  }
  const matchers = fs
    .readdirSync(matchersFolder)
    .filter((it) => it.endsWith('.matcher.js'));
  if (matchers.length == 0) {
    throw `No matcher found in ${matchersFolder}, they must be named '<anything>.matcher.js'`;
  }
  const matchingMatchers = matchers
    .map((it) => {
      return {
        file: it,
        matcher: require(path.join(matchersFolder, it)) as Matcher,
      };
    })
    .filter((it) => it.matcher.isMatching(repoFolder));
  if (matchingMatchers.length == 0) {
    throw `No matcher in ${matchersFolder} matched ${repoFolder}`;
  }
  if (matchingMatchers.length > 1) {
    throw `Several matchers in ${matchersFolder} matched ${repoFolder}: ${matchingMatchers.map(
      (it) => it.file
    )}`;
  }
  const matcher = matchingMatchers[0].matcher;
  const name = matcher.getName(repoFolder);
  const startCommand = matcher.getStartCommand(repoFolder);
  const prepareCommand = matcher.getPrepareCommand(repoFolder);
  return {
    name,
    startCommand,
    prepareCommand,
    preStart: matcher.preStart,
    isReady: matcher.isReady,
  } as Matched;
}

export function getGitRevision(folder: string): string {
  try {
    return execSync(`git rev-parse HEAD`, { cwd: folder }).toString().trim();
  } catch (e) {
    console.log(`unable to get git revision in ${folder}`);
    throw e;
  }
}
