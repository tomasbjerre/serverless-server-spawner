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

## API

RESTful API of the this server.

```
GET /dispatch?cloneurl={cloneUrl}&branch={branch}
```

```
GET /servers
```

```
GET /servers/:id
```

```
GET /servers/:id/state
```

```
GET /servers/:id/log/clone
```

```
GET /servers/:id/log/run
```

```
GET /servers/:id/log/spawn
```

```
GET /cloneurlcategories
```

```
GET /cloneurlcategories/:category1/:category2/branches
```

```
POST /clearcache
```

```
POST /killitwithfire
```
