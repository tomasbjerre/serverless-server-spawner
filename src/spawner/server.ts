import express from 'express';
import { Workspace } from '../common/workspace';
import { serverIdentity } from '../common/common';
import { ServerSettings } from './Model';
import { ServerId, ServerLogFile } from '../common/Model';

export function run(settings: ServerSettings) {
  const workspace = new Workspace(settings.workspace);
  const app = express();

  app.get('/dispatch', function (req, res) {
    const cloneUrl = req.query.cloneurl as string;
    const branch = req.query.branch as string;
    const identity = serverIdentity({ cloneUrl, branch });
    //TODO: Spawn internal/bin.js to clone and start
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
