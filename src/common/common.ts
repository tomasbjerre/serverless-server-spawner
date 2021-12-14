import { v4 as uuidv4, validate } from 'uuid';
import { Matched, Matcher } from './Model';
import fs from 'fs';

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
    .filter((it) => it.endsWith('.matcher.js'))
    .map((it) => {
      return { file: it, matcher: require(it) as Matcher };
    })
    .filter((it) => it.matcher.isMatching(repoFolder));
  if (matchers.length == 0) {
    throw `No matcher in ${matchersFolder} matched ${repoFolder}`;
  }
  if (matchers.length > 1) {
    throw `Several matchers in ${matchersFolder} matched ${repoFolder}: ${matchers.map(
      (it) => it.file
    )}`;
  }
  const matcher = matchers[0].matcher;
  return {
    name: matcher.getName(repoFolder),
    startCommand: matcher.getStartCommand(repoFolder),
  } as Matched;
}
