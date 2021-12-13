import { v4 as uuidv4, validate } from 'uuid';
import { Matched } from './Model';

export function randomString(length = 10) {
  return (Math.random() + 1).toString(36).substring(length);
}

export function randomUUID() {
  return uuidv4();
}

export function validateUuid(it: string) {
  return validate(it);
}

export function getMatched(folder: string): Matched {
  return {} as Matched;
}
