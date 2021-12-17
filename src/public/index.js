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
      if (server.name) {
        $('#servers').append(
          `<li>
          <a href="http://localhost:${server.port}" target="_blank">${server.name}</a> -
          <a href="/api/servers/${server.id}/state" target="_blank"><i>state</i></a>
          Log:
          <a href="/api/servers/${server.id}/log/clone" target="_blank"><i>clone</i></a>
          <a href="/api/servers/${server.id}/log/run" target="_blank"><i>run</i></a>
          <a href="/api/servers/${server.id}/log/spawn" target="_blank"><i>spawn</i></a>
          </li>`
        );
      } else {
        $('#servers').append(`<li>Spawning ${server.id}...</li>`);
      }
    }
  });
}

function checkDispatch() {
  $('#dispatch').html(`Waiting for server to start...`);
  var hashParams = getHashParams();
  if (hashParams.action == 'dispatch') {
    $('#loading').show();
    $.get('api/servers', function (servers) {
      $('#servers').empty();
      for (var server of servers) {
        if (server.id == hashParams.server && server.port) {
          var url = `${window.location.protocol}//${window.location.hostname}:${server.port}`;
          $('#dispatch').html(`Navigating to ${url} ...`);
          window.location.href = url;
        }
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
  }, 10000);
});
