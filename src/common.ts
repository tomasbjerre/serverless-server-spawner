export function serverIdentity(cloneUrl: string, branch: string) {
  return Buffer.from(`${cloneUrl} | ${branch}`).toString('base64');
}
