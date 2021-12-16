This is work in progress...

---

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
function getName(repoFolder) {
  return `a name, probably derived from whats inside repoFolder`;
}

function getStartCommand(repoFolder) {
  return `any command to run withing repoFolder`;
}

function isMatching(repoFolder) {
  return true; // If this matcher matches whats inside repoFolder
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
GET /api/servers/:id/log/clone
```

```
GET /api/servers/:id/log/run
```

```
GET /api/servers/:id/log/spawn
```

```
GET /api/cloneurlcategories
```

```
GET /api/cloneurlcategories/:category1/:category2/branches
```

```
POST /api/clearcache
```

```
POST /api/killitwithfire
```
