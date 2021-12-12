export interface ServerIdentity {
  cloneUrl: string;
  branch: string;
}

export function serverIdentity(serverIdentity: ServerIdentity) {
  return Buffer.from(JSON.stringify(serverIdentity)).toString('base64');
}

export function getServerIdentity(serverIdentity: string): ServerIdentity {
  return JSON.parse(new Buffer(serverIdentity, 'base64').toString('ascii'));
}
