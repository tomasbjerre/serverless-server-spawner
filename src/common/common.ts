import { v4 as uuidv4, validate } from 'uuid';
import { Matched, Matcher } from './Model';
import fs from 'fs';
import path from 'path';

export function randomString(length = 10) {
  return (Math.random() + 1).toString(36).substring(length);
}

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
  console.log(
    `Matched '${name}' that can be prepared with '${prepareCommand}' and started with '${startCommand}'`
  );
  return {
    name,
    startCommand,
    prepareCommand,
  } as Matched;
}
