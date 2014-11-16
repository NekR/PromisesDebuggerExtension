(function() {
  var currentScript = document.currentScript;
  var origin = currentScript.src.indexOf('/worker/embed.js');
  origin = currentScript.src.slice(0, origin) + '/worker';

  var DEBUGGER_URL = '/window.html';
  var WORKER_URL = '/worker.html';
  var ENV_URL = '/scripts/env.js';
  var BACKEND_URL = '/shared/promises-backend.js';

  var STORE_KEY = '__PromisesDebuggerBackend__';
  var WINDOW_NAME = '__PromisesDebuggerWindow__';

  var getURL = function(path) {
    return origin + path;
  };

  var openWindow = function() {
    var win = window.open(null, WINDOW_NAME);

    try {
      if (win && win.location.href === 'about:blank') {
        win.location.href = getURL(DEBUGGER_URL);
      } else if (win) {
        win.close();
      }
    } catch (e) {
      // win.close();
      win = window.open(getURL(DEBUGGER_URL), WINDOW_NAME);
    }

    return win;
  };

  var createIframe = function() {
    var id = '__pde_iframe__';
    document.write('<div><iframe id="' + id + '" style="border: none; display: block; width: 100%; box-shadow: 0 0 1px 3px rgba(0, 0, 0, 0.4); height: ' + window.innerHeight / 2 + 'px; margin-bottom: 20px;" src="' + getURL(DEBUGGER_URL) + '"></iframe></div>');

    var iframe = document.getElementById(id);
    var win = iframe.contentWindow;

    return win;
  };

  var createWorker = function() {
    var id = '__pde_worker__';

    window.addEventListener('message', function(e) {
      var data = e.data;

      if (data && e.source === win && data.PromisesWorker &&
          data.action && workerActions.hasOwnProperty(data.action)) {
        workerActions[data.action](data.message);
      }
    });

    document.write('<iframe id="' + id + '" style="display: none;" src="' + getURL(WORKER_URL) + '"></iframe>');

    var iframe = document.getElementById(id);
    var win = iframe.contentWindow;

    return win;
  };

  var createPanel = function() {
    window.addEventListener('message', function(e) {
      var data = e.data;

      if (
        data && e.source === win && data.PromisesWindow
      ) {
        if (data.action === 'panel_ready') {
          onPanelReady();
        } else if (data.action === 'proxy') {
          handlePanelData(data.data);
        }
      }
    });

    var iframe = currentScript.hasAttribute('iframe');
    var win = iframe ? createIframe() : openWindow();

    return win;
  };

  var worker = createWorker();
  var panelWindow = createPanel();
  var panelPending = [];
  var backendStored = sessionStorage.getItem(STORE_KEY);
  var panelWindowReady = false;
  var hasBackend = false;

  var serviceActions = {
    attach: function() {
      attachBackend();
    },
    reload_and_attach: function() {
      sessionStorage.setItem(STORE_KEY, backendStored);
      window.location.reload();
    },
    open_resource: function(message) {

    },
    detach: function() {

    }
  };

  var workerActions = {
    backend_code: function(message) {
      var code = message.code;

      backendStored = code;
    }
  };

  var onPanelReady = function() {
    panelWindowReady = true;
    console.log('PANEL READY!');

    if (hasBackend) {
      UIAction('show_main');
    } else {
      UIAction('show_need_reload');
    }

    if (panelPending && panelPending.length) {
      panelPending.forEach(function(data) {
        UIAction(data[0], data[1]);
      });

      panelPending = [];
    }
  };

  var attachBackend = function() {
    var fn = new Function(backendStored);

    fn();
  };

  var UIAction = function(action, message) {
    if (panelWindowReady) {
      panelWindow.postMessage({
        action: action,
        message: message
      }, '*');
    } else {
      panelPending.push([action, message]);
    }
  };

  var backendListener = function(e) {
    var data = e.data;

    if (!data || !data.PromisesDebugger) return;

    if (data.method === 'requestUpdate') {
      UIAction('update_data', data.message);
    } else if (data.method === 'reportError') {

    }
  };

  var handlePanelData = function(data) {
    if (data.serviceAction && serviceActions.hasOwnProperty(data.serviceAction)) {
      serviceActions[data.serviceAction](data.message);
    }
  };

  window.addEventListener('message', backendListener);

  if (backendStored) {
    hasBackend = true;
    attachBackend();
  }
}());