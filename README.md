# Serverless Server Spawner

[![NPM](https://img.shields.io/npm/v/serverless-server-spawner.svg?style=flat-square)](https://www.npmjs.com/package/serverless-server-spawner)

Basic idea:

- Start a server with `npx serverless-server-spawner`.
- Invoke the server with `https://serverless/?cloneurl=X&branch=Y`
- Server will
  - Clone that repo and checkout that branch
  - Detect what was cloned and starta a server
  - Keep that server alive for configurable amount of time

Detection is done with configurable matchers. A matcher:

- Determines a fitting name
- How to start the server

As the servers are spawned it will keep track of all processes. Provides an API as well as a nice dashboard showing status of the setup.

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

function getStartCommand(repoFolder) {
  // Environment variable named "PORT" contains the allocated port
  return `npm run start`;
}

module.exports = { getName, getStartCommand, isMatching };
```

And you point at them with:

```sh
npx serverless-server-spawner \
  --matchers-folder /path/to/serverless-matchers
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
