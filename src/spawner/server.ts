import express from 'express';
import NodeCache from 'node-cache';
import { Workspace } from '../common/workspace';
import { ServerId, ServerLogFile, ServerSettings } from '../common/Model';
import { shutdownProcess, spawnProcess } from '../common/process';
import { GitService } from '../common/GitService';

export function run(settings: ServerSettings) {
  const workspace = new Workspace(settings.workspace);
  const cache = new NodeCache({
    stdTTL: settings.cacheTtl,
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

  app.get('/cloneurlcategories', function (req, res) {
    const cloneUrls = getCachedOrFetch('cloneurls', () =>
      GitService.from(settings.gitService).getCloneUrlCategories()
    );
    res.write(cloneUrls);
  });

  app.get(
    '/cloneurlcategories/:category1/:category2/branches',
    function (req, res) {
      const category1 = req.params.category1;
      const category2 = req.params.category2;
      const branches = getCachedOrFetch(
        `branches-${category1}-${category2}`,
        () =>
          GitService.from(settings.gitService).getCloneUrls({
            category1,
            category2,
          })
      );
      res.write(branches);
    }
  );

  app.post('/clearcache', function (req, res) {
    cache.flushAll();
    res.write({});
  });

  app.post('/killitwithfire', async function (req, res) {
    for (let server of workspace.getServers()) {
      const spawnPid = workspace.getServerPid(server.id, 'spawn');
      if (spawnPid != -1) {
        console.log(`killing spawn ${spawnPid}`);
        await shutdownProcess(spawnPid);
      }
      const clonePid = workspace.getServerPid(server.id, 'clone');
      if (clonePid != -1) {
        console.log(`killing clone ${clonePid}`);
        await shutdownProcess(clonePid);
      }
      const runPid = workspace.getServerPid(server.id, 'run');
      if (runPid != -1) {
        console.log(`killing run ${runPid}`);
        await shutdownProcess(runPid);
      }
      console.log(`removing server ${server.id}`);
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
