import path from 'path';
import express, { Response, Request } from 'express';
import NodeCache from 'node-cache';
import { Workspace } from '../common/workspace';
import { ServerId, ServerLogFile, ServerSettings } from '../common/Model';
import {
  shutdownProcess,
  spawnProcess,
  processExists,
} from '../common/process';
import { GitService } from '../common/GitService';

export async function run(settings: ServerSettings) {
  const workspace = new Workspace(settings.workspace);

  async function stopServer(serverId: ServerId) {
    console.log(`stopping server ${serverId}`);
    for (let state of ['run', 'prepare', 'spawn', 'clone'] as ServerLogFile[]) {
      const pid = workspace.getServerPid(serverId, state);
      if (pid != -1) {
        console.log(`killing ${serverId} ${state} ${pid}`);
        try {
          shutdownProcess(pid);
        } catch (e) {
          console.log(`Was unable to kill ${pid}`, e);
        }
      } else {
        console.log(`no pid for ${serverId} ${state}`);
      }
    }
  }

  async function killitwithfire() {
    console.log(`Killing any spawned processes in ${settings.workspace} ...`);
    for (let server of workspace.getServers()) {
      await stopServer(server.id);
    }
    console.log(`Emptying ${settings.workspace} ...`);
    workspace.removeAll();
  }

  if (settings.cleanup) {
    await killitwithfire();
  }

  function spawnServer(serverId: ServerId) {
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
  }

  const cache = new NodeCache({
    stdTTL: settings.cacheTtl * 60,
  });
  const app = express();

  app.get('/api/dispatch', function (req: Request, res: Response) {
    const cloneUrl = req.query.cloneurl as string;
    const branch = req.query.branch as string;
    const serverId = workspace.getOrCreate(cloneUrl, branch);
    spawnServer(serverId);
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

  app.post('/api/servers/:id/start', function (req: Request, res: Response) {
    const id = req.params.id as ServerId;
    const serverState = workspace.getServerState(id);
    if (serverState == 'stop') {
      spawnServer(id);
      res.json({});
    }
  });

  app.post(
    '/api/servers/:id/stop',
    async function (req: Request, res: Response) {
      const id = req.params.id as ServerId;
      const serverState = workspace.getServerState(id);
      if (serverState != 'stop') {
        await stopServer(id);
      }
      res.json({});
    }
  );

  function getLog(log: ServerLogFile, req: Request, res: Response): void {
    const id = req.params.id as ServerId;
    const logContent = workspace.getServerLog(id, log);
    res.setHeader('content-type', 'text/plain');
    res.send(logContent);
  }

  app.get('/api/servers/:id/log/clone', function (req: Request, res: Response) {
    getLog('clone', req, res);
  });

  app.get(
    '/api/servers/:id/log/prepare',
    function (req: Request, res: Response) {
      getLog('prepare', req, res);
    }
  );

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
    await killitwithfire();
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

  process.on('uncaughtException', (err) => {
    console.log(err);
  });

  app.listen(settings.port);
}
