import { ProcessId } from './Model';
import fs from 'fs';
const { spawn } = require('child_process');

export const shutdownProcess = (
  pid: ProcessId,
  signal = 'SIGILL',
  timeout = 20000
) =>
  new Promise<void>((resolve, reject) => {
    process.kill(pid, signal);
    let count = 0;
    setInterval(() => {
      try {
        console.log(`sending ${signal} to ${pid}`);
        process.kill(pid, 0);
      } catch (e) {
        console.log(`the process ${pid} does not exists anymore`);
        resolve();
      }
      if ((count += 100) > timeout) {
        console.log(`giving up on ${pid}`);
        reject(new Error(`Timeout process kill`));
      }
    }, 100);
  });

export function spawnProcess(
  command: string,
  args: any[],
  logFile: string,
  pidFile: string,
  opts = {}
): any {
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  const p = spawn(command, args, opts);
  fs.writeFileSync(pidFile, `${p.pid}`);
  p.stdout.pipe(logStream);
  p.stderr.pipe(logStream);
  p.on('close', () => {
    fs.unlinkSync(pidFile);
  });
  return p;
}
