import express from 'express';
import NodeCache from 'node-cache';
import { Workspace } from '../common/workspace';
import { ServerId, ServerLogFile, ServerSettings } from '../common/Model';
import { shutdownProcess, spawnProcess } from '../common/process';
import { GitService } from '../common/GitService';

export function run(settings: ServerSettings) {
  const workspace = new Workspace(settings.workspace);
  const cache = new NodeCache({
    stdTTL: 60 * 60,
  });
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

  app.get('/servers', function (req, res) {
    const servers = workspace.getServers();
    res.write(servers);
  });

  app.get('/servers/:id', function (req, res) {
    const id = req.params.id as string;
    const servers = workspace.getServer(id);
    res.write(servers);
  });

  app.get('/servers/:id/state', function (req, res) {
    const id = req.params.id as ServerId;
    const serverState = workspace.getServerState(id);
    res.write({ state: serverState });
  });

  function getLog(log: ServerLogFile, req: any, res: any): void {
    const id = req.params.id as ServerId;
    const logContent = workspace.getServerLog(id, log);
    res.write(logContent);
  }

  app.get('/servers/:id/log/clone', function (req, res) {
    getLog('clone', req, res);
  });

  app.get('/servers/:id/log/run', function (req, res) {
    getLog('run', req, res);
  });

  app.get('/servers/:id/log/spawn', function (req, res) {
    getLog('spawn', req, res);
  });

  function getCachedOrFetch(key: string, getter: () => any): any {
    if (!cache.has(key)) {
      const val = getter();
      cache.set(key, val);
    }
    return cache.get(key);
  }

  app.get('/cloneurls', function (req, res) {
    const cloneUrls = getCachedOrFetch('cloneurls', () =>
      GitService.from(settings.gitService).getCloneUrls()
    );
    res.write(cloneUrls);
  });

  app.get('/cloneurls/:cloneUrl/branches', function (req, res) {
    const cloneUrl = req.params.cloneUrl;
    const branches = getCachedOrFetch('branches', () =>
      GitService.from(settings.gitService).getBranches(cloneUrl)
    );
    res.write(branches);
  });

  app.post('/clearcache', function (req, res) {
    cache.flushAll();
    res.write({});
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
