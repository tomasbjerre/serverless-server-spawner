import path from 'path';
import express, { Response, Request } from 'express';
import NodeCache from 'node-cache';
import { Workspace } from '../common/workspace';
import { ServerId, ServerLogFile, ServerSettings } from '../common/Model';
import { shutdownProcess, spawnProcess } from '../common/process';
import { GitService } from '../common/GitService';

export function run(settings: ServerSettings) {
  const workspace = new Workspace(settings.workspace);
  const cache = new NodeCache({
    stdTTL: settings.cacheTtl * 60,
  });
  const app = express();

  app.get('/api/dispatch', function (req: Request, res: Response) {
    const cloneUrl = req.query.cloneurl as string;
    const branch = req.query.branch as string;
    const serverId = workspace.getOrCreate(cloneUrl, branch);
    const spawnLog = workspace.getServerLogFile(serverId, 'spawn');
    const spawnPidFile = workspace.getServerPidFile(serverId, 'spawn');
    spawnProcess(
      'nodejs',
      [
        path.join(__dirname, '..', 'internal', 'bin.js'),
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
        '--minimum-port-number',
        settings.minimumPortNumber,
        '--maximum-port-number',
        settings.maximumPortNumber,
      ],
      spawnLog,
      spawnPidFile
    );
    res.redirect(`${settings.dashboardUrl}#action=dispatch&server=${serverId}`);
  });

  app.get('/api/servers', function (req: Request, res: Response) {
    const servers = workspace.getServers();
    res.json(servers);
  });

  app.get('/api/servers/:id', function (req: Request, res: Response) {
    const id = req.params.id as string;
    const servers = workspace.getServer(id);
    res.json(servers);
  });

  app.get('/api/servers/:id/state', function (req: Request, res: Response) {
    const id = req.params.id as ServerId;
    const serverState = workspace.getServerState(id);
    res.json({ state: serverState });
  });

  function getLog(log: ServerLogFile, req: Request, res: Response): void {
    const id = req.params.id as ServerId;
    const logContent = workspace.getServerLog(id, log);
    res.send(logContent);
  }

  app.get('/api/servers/:id/log/clone', function (req: Request, res: Response) {
    getLog('clone', req, res);
  });

  app.get('/api/servers/:id/log/run', function (req: Request, res: Response) {
    getLog('run', req, res);
  });

  app.get('/api/servers/:id/log/spawn', function (req: Request, res: Response) {
    getLog('spawn', req, res);
  });

  function getCachedOrFetch(key: string, getter: () => any): any {
    if (!cache.has(key)) {
      const val = getter();
      cache.set(key, val);
    }
    return cache.get(key);
  }

  app.get('/api/cloneurlcategories', function (req: Request, res: Response) {
    const cloneUrls = getCachedOrFetch('cloneurls', () =>
      GitService.from(settings.gitService).getCloneUrlCategories()
    );
    res.json(cloneUrls);
  });

  app.get(
    '/api/cloneurlcategories/:category1/:category2/branches',
    function (req: Request, res: Response) {
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
      res.json(branches);
    }
  );

  app.post('/api/clearcache', function (req: Request, res: Response) {
    cache.flushAll();
    res.json({});
  });

  app.post('/api/killitwithfire', async function (req: Request, res: Response) {
    for (let server of workspace.getServers()) {
      for (let state of ['clone', 'spawn', 'run'] as ServerLogFile[]) {
        const pid = workspace.getServerPid(server.id, state);
        if (pid != -1) {
          console.log(`killing ${state} ${pid}`);
          await shutdownProcess(pid);
        }
      }
      console.log(`removing server ${server.id}`);
      workspace.removeServer(server.id);
    }
    res.json({});
  });

  app.use(express.static(path.join(__dirname, '..', '..', 'lib', 'public')));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(
      path.join(__dirname, '..', '..', 'lib', 'public', 'index.html')
    );
  });

  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    next(err);
  });

  app.listen(settings.port);
}
