A demo of [Serverless Server Spawner](https://github.com/tomasbjerre/serverless-server-spawner)

Start the server with:
```sh
npx serverless-server-spawner \
  --matchers-folder `pwd`/matchers
```

Dispatch the example app with:

http://localhost:8080/api/dispatch?cloneurl=git%40github.com%3Atomasbjerre%2Fserverless-server-spawner-demo-app.git&branch=master

Or just browse to the built in dashboard:

http://localhost:8080/
