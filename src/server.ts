import express, { ErrorRequestHandler } from 'express';
import { Workspace } from './workspace';

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
    const server = workspace.getOrCreate(cloneUrl, branch);
    res.redirect(`${settings.dashboardUrl}?server=${server.identity}`);
  });

  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    next(err);
  });

  app.listen(settings.port);
}
