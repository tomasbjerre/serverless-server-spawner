import express from 'express';
import { Workspace } from './workspace';
import { serverIdentity } from './common';

export interface ServerSettings {
  port: number;
  workspace: string;
  dashboardUrl: string;
}

process
  .on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p);
  })
  .on('uncaughtException', (err) => {
    console.error(err, 'Uncaught Exception thrown');
    process.exit(1);
  });

export function run(settings: ServerSettings) {
  const workspace = new Workspace(settings.workspace);
  const app = express();

  app.get('/dispatch', function (req, res) {
    const cloneUrl = req.query.cloneurl as string;
    const branch = req.query.branch as string;
    const identity = serverIdentity({ cloneUrl, branch });
    //TODO: Spawn internalIndex to clone and start
    res.redirect(`${settings.dashboardUrl}#/dispatch?server=${identity}`);
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

  app.get('/server/:id/log', function (req, res) {
    const id = req.params.id as string;
    const log = workspace.getServerLog(id);
    res.write(log);
  });

  app.post('/killitwithfire', function (req, res) {
    workspace.killItWithFire();
    res.write({});
  });

  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    next(err);
  });

  app.listen(settings.port);
}
