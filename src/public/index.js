HEARTBEAT = 1000;

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
  if (millis < 0) {
    return 0;
  }
  var sec_num = millis / 1000;
  var hours = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - hours * 3600) / 60);
  var seconds = Math.floor(sec_num - hours * 3600 - minutes * 60);
  return hours + ' hours, ' + minutes + ' minutes and ' + seconds + ' seconds';
}

function toPercent(endMillis, startMillis) {
  var millisLeft = endMillis - Date.now();
  var totalMillis = endMillis - startMillis;
  var percent = Math.round((millisLeft / totalMillis) * 100);
  if (percent > 0) {
    return percent;
  }
  return 0;
}

function killitwithfire() {
  $.post('/api/killitwithfire', function () {});
}

function clearcache() {
  $.post('/api/clearcache', function () {});
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
        } (${server.branch} ${server.revision})</a> -
          <a href="/api/servers/${
            server.id
          }/state" target="_blank"><i>state</i></a>
          <br/>
          Log:
          <a href="/#action=log&server=${server.id}">log</a>
          <br/>
          <i>${formatTime(server.endTimestamp - Date.now())}</i>
          <b style="color: rgb(0,${Math.round(
            (255 / 100) * toPercent(server.endTimestamp, server.startTimestamp)
          )},0)">${toPercent(server.endTimestamp, server.startTimestamp)}%</b>
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
    showLog(hashParams.server);
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
        var url = `${window.location.protocol}//${window.location.host}/#action=failed&server=${hashParams.server}`;
        window.location.href = url;
      }
    });
  }
}

function checkStartupFailed() {
  var hashParams = getHashParams();
  if (hashParams.action == 'failed') {
    showLog(hashParams.server);
  }
}

function checkLog() {
  var hashParams = getHashParams();
  if (hashParams.action == 'log') {
    $.get('api/servers/' + hashParams.server + '/state', function (server) {
      if (server.state == 'stop') {
        var url = `${window.location.protocol}//${window.location.host}`;
        window.location.href = url;
      }
    });
    showLog(hashParams.server);
  }
}

function showLog(server) {
  ['run', 'prepare', 'clone', 'spawn'].forEach((kind) => {
    $.get(`api/servers/${server}/log/${kind}`, function (log) {
      if (log.trim() != '') {
        $(`#log-${kind}`)
          .show()
          .val(log)
          .scrollTop($(`#log-${kind}`)[0].scrollHeight);
      }
    });
  });
}

function pulse() {
  checkDispatch();
  checkStartupFailed();
  checkLog();
  updateServerList();
}
$(document).ready(function () {
  pulse();
  var intervalId = setInterval(function () {
    pulse();
  }, HEARTBEAT);
});
