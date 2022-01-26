# Serverless Server Spawner

[![NPM](https://img.shields.io/npm/v/serverless-server-spawner.svg?style=flat-square)](https://www.npmjs.com/package/serverless-server-spawner)

Basic idea:

- Start it with `npx serverless-server-spawner`.
- Invoke it with `https://localhost:P/?cloneurl=C&branch=B`
  - `P` - A configurable port.
  - `C` - A clone URL of a git Repo.
  - `B` - A branch in repo `C`.
- It will
  - Clone that repo.
  - Checkout that branch.
  - Recognize what was cloned.
  - Find a free port
  - Spawn a server
  - Wait for the spawned server to start
  - Redirect to the spawned server
  - Keep that server alive for configurable amount of time

Repositories are recognized using configurable matchers. A matcher:

- Determines a fitting name
- How to preparare the repository before start
- How to start the server

As the servers are spawned it will keep track of all processes. Provides an API as well as a dashboard showing status of the setup.

![A simple flow](/flow.png)

## Use cases

- Can be used to test feature-branches. Adding links from pull-requests to this server and let this server spawn servers running those features.
- ...

See example in this sandbox:
https://github.com/tomasbjerre/serverless-sandbox

## Matchers

- Put them in a folder
- name them like `*.matcher.js`

Example: `serverless-matchers/example.matcher.js`

Content should be like:

```js
function isMatching(repoFolder) {
  try {
    return require(`${repoFolder}/package.json`).scripts['start'] != undefined;
  } catch {
    return false;
  }
}

function getName(repoFolder) {
  return require(`${repoFolder}/package.json`).name;
}

function getPrepareCommand(repoFolder) {
  return `npm install`;
}

function preStart(repoFolder, env) {
  // Do struff before start
  // env contains port in evn.PORT
}

function getStartCommand(repoFolder) {
  // Environment variable named "PORT" contains the allocated port
  return `npm run start`;
}

module.exports = {
  isMatching,
  getName,
  getPrepareCommand,
  preStart,
  getStartCommand,
};
```

And you point at them with:

```sh
npx serverless-server-spawner \
  --matchers-folder /path/to/serverless-matchers
```

## Command line arguments

```shell
Usage: npx serverless-server-spawner [options]

Options:
  -V, --version                                    output the version number
  -ws, --workspace <folder>                        Filesystem to work with.
  -mf, --matchers-folder <folder>                  Folder containing matchers.
  -p, --port <number>                              Server port to use (default: "8080")
  -d, --dashboard-url <url>                        Base URL of dashboard (default: "http://localhost:8080")
  -ttl, --time-to-live <minutes>                   Time to keep server running after it was started. (default: "30")
  -bbsat, --bitbucket-server-access-token <token>  Bitbucket Server access token
  -bbsu, --bitbucket-server-url <url>              Bitbucket Server base URL to use for REST integration
  -bbsp, --bitbucket-server-projects <projects>    Bitbucket Server projects. Empty will include all projects.
  -mip, --minimum-port-number <port>               Minimum port number to use for spawned servers (default: "9000")
  -map, --maximum-port-number <port>               Maximum port number to use for spawned servers (default: "9999")
  -ct, --cache-ttl <minutes>                       Cache time to live, seconds (default: "120")
  -nc, --no-cleanup                                Do not cleanup state on startup: kill servers and clean workspace
  -h, --help                                       display help for command
```

## API

RESTful API of the this server.

The main entry point for new repo/branches is `dispatch`. It will start a server and, when started, redirect user to it.

```
GET /api/dispatch?cloneurl={cloneUrl}&branch={branch}
```

```
GET /api/servers
```

```
GET /api/servers/:id
```

```
GET /api/servers/:id/state
```

Stop, and cleanup, the server.

```
POST /api/servers/:id/stop
```

```
GET /api/servers/:id/log/spawn
```

```
GET /api/servers/:id/log/clone
```

```
GET /api/servers/:id/log/prepare
```

```
GET /api/servers/:id/log/run
```

If a Git service was configured, this will respond with clone URL:s in that service.

```
GET /api/cloneurlcategories
```

If a Git service was configured, this will respond with branches in categories.

```
GET /api/cloneurlcategories/:category1/:category2/branches
```

Clear all caches.

```
POST /api/clearcache
```

Stop all servers and cleanup workspace.

```
POST /api/stopandremoveallservers
```

Get settings used, like port range. So that you can calculate available ports.

```
GET /api/settings
```

## Developer instructions

During development it might help to start it with:

```shell
npm install \
 && npm run build \
 && node ./lib/spawner/bin.js \
 --matchers-folder /home/bjerre/workspace/serverless/serverless-sandbox/matchers \
 --time-to-live 1
```
