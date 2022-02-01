import path from 'path';
import express, { Response, Request } from 'express';
import NodeCache from 'node-cache';
import { Workspace } from '../common/workspace';
import { ServerId, ServerLogFile, ServerSettings } from '../common/Model';
import { GitService } from '../common/GitService';

function spawnServer(
  serverId: ServerId,
  settings: ServerSettings,
  workspace: Workspace
) {
  const args = [
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
  ].join(' ');
  const command = `node ${args}`;
  workspace.spawnServerCommand(serverId, 'spawn', __dirname, command, {});
}

export async function run(settings: ServerSettings) {
  const workspace = new Workspace(
    settings.workspace,
    settings.timeToLive,
    settings.matchersFolder
  );

  if (settings.cleanup) {
    workspace.stopAllServers();
    workspace.removeWorkspace();
  }

  const integrationCache = new NodeCache({
    stdTTL: settings.integrationCacheTtl * 60,
  });

  const shortCache = new NodeCache({
    stdTTL: 2,
  });

  async function getCachedOrFetch(
    cache: NodeCache,
    key: string,
    getter: () => any
  ): Promise<any> {
    if (!cache.has(key)) {
      const val = await getter();
      cache.set(key, val);
    }
    return cache.get(key);
  }

  const app = express();
  app.get('/api/dispatch', function (req: Request, res: Response) {
    const cloneUrl = req.query.cloneurl as string;
    const branch = req.query.branch as string;
    let serverId = workspace.findServer(
      cloneUrl,
      branch,
      settings.minimumSecondsBetweenDispatch
    );
    if (!serverId) {
      serverId = workspace.createServer(cloneUrl, branch);
      spawnServer(serverId, settings, workspace);
    }
    res.redirect(
      `${settings.dashboardUrl}?action=dispatch&serverid=${serverId}`
    );
  });

  app.get('/api/settings', function (req: Request, res: Response) {
    const safeSettings = JSON.parse(JSON.stringify(settings)) as ServerSettings;
    if (safeSettings.gitService.bitbucketServer) {
      safeSettings.gitService.bitbucketServer.personalAccessToken = '<masked>';
    }
    res.json(safeSettings);
  });

  app.get('/api/servers', async function (req: Request, res: Response) {
    const servers = await getCachedOrFetch(shortCache, `servers`, () =>
      workspace.getServers()
    );
    res.json(servers);
  });

  app.get('/api/servers/:id', async function (req: Request, res: Response) {
    const id = req.params.id as string;
    const server = await getCachedOrFetch(shortCache, `server-${id}`, () =>
      workspace.getServer(id)
    );
    res.json(server);
  });

  app.post('/api/servers/:id/stop', function (req: Request, res: Response) {
    const id = req.params.id as ServerId;
    workspace.stopServer(id);
    res.json({});
  });

  app.get(
    '/api/servers/:id/state',
    async function (req: Request, res: Response) {
      const id = req.params.id as ServerId;
      const serverState = await getCachedOrFetch(
        shortCache,
        `server-state-${id}`,
        () => workspace.getServerState(id)
      );
      res.json({ state: serverState });
    }
  );

  async function getLog(
    log: ServerLogFile,
    req: Request,
    res: Response
  ): Promise<void> {
    const id = req.params.id as ServerId;
    const logContent = await getCachedOrFetch(
      shortCache,
      `server-log-${id}-${log}`,
      () => workspace.getServerLog(id, log)
    );
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

  app.get(
    '/api/cloneurlcategories',
    async function (req: Request, res: Response) {
      const cloneUrls = await getCachedOrFetch(
        integrationCache,
        'cloneurls',
        async () =>
          await GitService.from(settings.gitService).getCloneUrlCategories()
      );
      res.json(cloneUrls);
    }
  );

  app.get(
    '/api/cloneurlcategories/:category1/:category2/branches',
    async function (req: Request, res: Response) {
      const category1 = req.params.category1;
      const category2 = req.params.category2;
      const branches = await getCachedOrFetch(
        integrationCache,
        `branches-${category1}-${category2}`,
        async () =>
          await GitService.from(settings.gitService).getCloneUrls(
            category1,
            category2
          )
      );
      res.json(branches);
    }
  );

  app.post('/api/clearcache', function (req: Request, res: Response) {
    integrationCache.flushAll();
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
