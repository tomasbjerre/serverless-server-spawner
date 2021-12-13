import { ProcessId } from './Model';

export const shutdownProcess = (
  pid: ProcessId,
  signal = 'SIGTERM',
  timeout = 20000
) =>
  new Promise((resolve, reject) => {
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
        reject(new Error('Timeout process kill'));
      }
    }, 100);
  });
