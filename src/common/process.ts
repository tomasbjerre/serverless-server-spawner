import { ProcessId } from './Model';
import fs from 'fs';
const { spawn } = require('child_process');

export function processExists(pid: ProcessId) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

export function shutdownProcess(pid: ProcessId, signal = 'SIGILL') {
  console.log(`sending ${signal} to ${pid}`);
  process.kill(pid, signal);
}

export function spawnProcess(
  command: string,
  args: any[],
  logFile: string,
  pidFile: string,
  opts: any = {}
): any {
  console.log(`Spawning '${command}' and logging to ${logFile} in ${opts.cwd}`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  const p = spawn(command, args, opts);
  console.log(`Storing PID of '${command}' as ${p.pid} in ${pidFile}`);
  fs.writeFileSync(pidFile, `${p.pid}`);
  p.stdout.pipe(logStream);
  p.stderr.pipe(logStream);
  p.on('close', () => {
    console.log(`Ended '${command}', removing ${pidFile}`);
    fs.unlinkSync(pidFile);
  });
  return p;
}
