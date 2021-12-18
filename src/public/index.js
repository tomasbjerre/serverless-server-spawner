function getHashParams() {
  var hashParams = {};
  var e,
    a = /\+/g, // Regex for replacing addition symbol with a space
    r = /([^&;=]+)=?([^&;]*)/g,
    d = function (s) {
      return decodeURIComponent(s.replace(a, ' '));
    },
    q = window.location.hash.substring(1);

  while ((e = r.exec(q))) hashParams[d(e[1])] = d(e[2]);

  return hashParams;
}

function formatTime(millis) {
  var sec_num = millis / 1000;
  var hours = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - hours * 3600) / 60);
  var seconds = Math.round(sec_num - hours * 3600 - minutes * 60);
  return hours + ' hours, ' + minutes + ' minutes and ' + seconds + ' seconds';
}

function percentLeft(endMillis, startMillis) {
  var millisLeft = endMillis - Date.now();
  var totalMillis = endMillis - startMillis;
  return Math.round((millisLeft / totalMillis) * 100);
}

function killitwithfire() {
  $.post('/api/killitwithfire', function () {});
}

function clearcache() {
  $.post('/api/clearcache', function () {});
}

function startServer(id) {
  $.post('/api/servers/' + id + '/start', function () {});
}

function stopServer(id) {
  $.post('/api/servers/' + id + '/stop', function () {});
}

function updateServerList() {
  $.get('api/servers', function (servers) {
    $('#servers').empty();
    for (let server of servers) {
      let url = server.port
        ? 'http://' + window.location.hostname + ':' + server.port
        : '#';
      $('#servers').append(
        `<li>
          <a href="${url}" target="_blank">${
          server.name ? server.name : server.id
        } (${server.revision})</a> -
          <a href="/api/servers/${
            server.id
          }/state" target="_blank"><i>state</i></a>
          <button onClick="startServer('${server.id}')">Start</button>
          <button onClick="stopServer('${server.id}')">Stop</button>
          <br/>
          Log:
          <a href="/api/servers/${
            server.id
          }/log/clone" target="_blank"><i>clone</i></a>
          <a href="/api/servers/${
            server.id
          }/log/prepare" target="_blank"><i>prepare</i></a>
          <a href="/api/servers/${
            server.id
          }/log/run" target="_blank"><i>run</i></a>
          <a href="/api/servers/${
            server.id
          }/log/spawn" target="_blank"><i>spawn</i></a>
          <br/>
          <i>${formatTime(server.endTimestamp, server.startTimestamp)}</i>
          <b style="color: rgb(0,${Math.round(
            (255 / 100) *
              percentLeft(server.endTimestamp, server.startTimestamp)
          )},0)">${percentLeft(server.endTimestamp, server.startTimestamp)}%</b>
          </li>`
      );
    }
  });
}

function checkDispatch() {
  $('#dispatch').html(`Waiting for server to start...`);
  var hashParams = getHashParams();
  if (hashParams.action == 'dispatch') {
    $('#loading').show();
    $.get('api/servers/' + hashParams.server + '/state', function (server) {
      if (server.state == 'run') {
        $.get('api/servers', function (servers) {
          for (let serverDetails of servers) {
            if (serverDetails.id == hashParams.server) {
              var url = `${window.location.protocol}//${window.location.hostname}:${serverDetails.port}`;
              $('#dispatch').html(`Navigating to ${url} ...`);
              window.location.href = url;
            }
          }
        });
      } else if (server.state == 'clone') {
        $('#dispatch').html(`Cloning ...`);
      } else if (server.state == 'spawn') {
        $('#dispatch').html(`Spawn ...`);
      } else if (server.state == 'stop') {
        $('#dispatch').html(``);
        var url = `${window.location.protocol}//${window.location.host}`;
        window.location.href = url;
      }
    });
  }
}

function pulse() {
  checkDispatch();
  updateServerList();
}
$(document).ready(function () {
  pulse();
  var intervalId = setInterval(function () {
    pulse();
  }, 5000);
});
