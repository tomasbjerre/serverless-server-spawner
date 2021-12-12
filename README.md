This is work in progress...

---

# Serverless Server Spawner

[![NPM](https://img.shields.io/npm/v/serverless-server-spawner.svg?style=flat-square)](https://www.npmjs.com/package/serverless-server-spawner)

Basic idea:

- Start a server with `npx serverless-server-spawner`.
- Invoke it with `https://serverless/?cloneurl=X&branch=Y`
- Clone that repo and checkout that branch
- Detect what was cloned and starta a server

Detection is done with configurable matchers. A matcher:

- Determines a fitting name
- How to start the server

As the servers are spawned it will keep track of all processes. Provides an API as well as a nice dashboard showing status of the setup.

## API

RESTful API of the this server.

## `GET /dispatch?cloneurl={cloneUrl}&branch={branch}`

This is the entry point where users would typically be directed when they want to use a server.

Responds with http redirect to the configured dashboard.

## `GET /server/{id}`

Details about the server.

```json
{
  "id": "{id}",
  "status": "STARTED|STARTING"
}
```

## `GET /server/{id}/log`

The server log.

```any
...
```

## `GET /server`

All servers.

```json
[
  {
    "id": "{id}",
    "status": "STARTED|STARTING"
  }
]
```

## `POST /killitwithfire`

Shut down all servers and cleanup everything.
