import express from 'express';
import { Workspace } from '../common/workspace';
import { ServerSettings } from './Model';
import { ServerId, ServerLogFile } from '../common/Model';
import { shutdownProcess, spawnProcess } from '../common/process';

export function run(settings: ServerSettings) {
  const workspace = new Workspace(settings.workspace);
  const app = express();

  app.get('/dispatch', function (req, res) {
    const cloneUrl = req.query.cloneurl as string;
    const branch = req.query.branch as string;
    const serverId = workspace.getOrCreate(cloneUrl, branch);
    const spawnLog = workspace.getServerLogFile(serverId, 'spawn');
    const spawnPidFile = workspace.getServerPidFile(serverId, 'spawn');
    spawnProcess(
      '../internal/bin',
      [
        '--workspace',
        settings.workspace,
        '--matchers-folder',
        settings.matchersFolder,
        '--task',
        'spawn',
        '--server',
        serverId,
        '--time-to-live',
        settings.timeToLive,
      ],
      spawnLog,
      spawnPidFile
    );
    res.redirect(`${settings.dashboardUrl}#/dispatch?server=${serverId}`);
  });

  app.get('/server', function (req, res) {
    const servers = workspace.getServers();
    res.write(servers);
  });

  app.get('/server/:id', function (req, res) {
    const id = req.params.id as string;
    const servers = workspace.getServer(id);
    res.write(servers);
  });

  app.get('/server/:id/state', function (req, res) {
    const id = req.params.id as ServerId;
    const serverState = workspace.getServerState(id);
    res.write({ state: serverState });
  });

  function getLog(log: ServerLogFile, req: any, res: any): void {
    const id = req.params.id as ServerId;
    const logContent = workspace.getServerLog(id, log);
    res.write(logContent);
  }

  app.get('/server/:id/log/clone', function (req, res) {
    getLog('clone', req, res);
  });

  app.get('/server/:id/log/run', function (req, res) {
    getLog('run', req, res);
  });

  app.get('/server/:id/log/spawn', function (req, res) {
    getLog('spawn', req, res);
  });

  app.post('/killitwithfire', async function (req, res) {
    for (let server of workspace.getServers()) {
      const pid = workspace.getServerPid(server.id, 'run');
      await shutdownProcess(pid);
      workspace.removeServer(server.id);
    }
    res.write({});
  });

  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    next(err);
  });

  app.listen(settings.port);
}
