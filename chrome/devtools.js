var panel,
  panelWindow,
  panelPending = [],
  watchListenersRegistered;

chrome.devtools.panels.create('Promises', '', 'shared/promises-panel.html', function(promisesPanel) {
  panel = promisesPanel;

  panel.onShown.addListener(function waitShow(win) {
    panelWindow = win;

    var arr = panelPending;

    panelPending = [];

    arr.forEach(function(arr) {
      UIAction(arr[0], arr[1]);
    });

    panel.onShown.removeListener(waitShow);

    registerWatchListeners();
    listenUICommands();

    isWatchingPagePromise.then(function() {
      if (isWatchingPage) {
        UIAction('show_not_attached');
      } else {
        UIAction('show_need_reload');
      }
    });
  });
});

var port = chrome.runtime.connect({
  name: 'DEV_TOOLS'
});

var requestWatchTab = function(callback, options) {
  port.postMessage({
    action: 'start_watch_page',
    data: {
      tabId: chrome.devtools.inspectedWindow.tabId,
      attach: options && !!options.attach
    }
  });

  var waitForWatchStart = function(message, port) {
    if (message.action !== 'watch_started') return;

    // here we need reload
    // show reload view
    port.onMessage.removeListener(waitForWatchStart);
    startWaitReloads();

    if (callback) {
      callback();
    }
  };

  port.onMessage.addListener(waitForWatchStart);
},
requestStopWatch = function() {
  stopWaitReloads();

  port.postMessage({
    action: 'stop_watch_page',
    data: {
      tabId: chrome.devtools.inspectedWindow.tabId
    }
  });
},
registerWatchListeners = function() {
  console.log('registerWatchListeners');

  if (!watchListenersRegistered) {
    port.onMessage.addListener(function(message) {
      if (message.action === 'front_end_event') {
        handleFrontEndEvent(message.data);
      }
    });
  }

  watchListenersRegistered = true;
},/*
evalDebugBackend = function(callback) {
  var xhr = new XMLHttpRequest();

  xhr.open('GET', 'shared/promises-backend2.js', false);
  xhr.send();

  chrome.devtools.inspectedWindow.eval(xhr.response, function(result, exception) {
    if (exception && exception.value) {
      throw exception.value;
    }

    if (callback) {
      callback();
    }
  });
},*/
startWaitReloads = function() {
  // request wait reloads
  port.onMessage.addListener(onReload);
},
stopWaitReloads = function() {
  // request wait reloads
  port.onMessage.removeListener(onReload);
},
handleFrontEndEvent = function(message) {
  // console.log('handleFrontEndEvent', message);

  UIAction(message.action, message.data);
},
frontEndCommand = function(command) {
  chrome.devtools.inspectedWindow.eval(command + '();', {
    useContentScriptContext: true
  });
},
UIAction = function(action, message) {
  if (panelWindow) {
    panelWindow.postMessage({
      action: action,
      message: message
    }, '*');
  } else {
    panelPending.push([action, message]);
  }
},
listenUICommands = function() {
  if (!panelWindow) return;

  panelWindow.addEventListener('message', function(e) {
    var data = e.data;

    // console.log('UI command', data);

    if (data && data.serviceAction &&
      serviceActions.hasOwnProperty(data.serviceAction)
    ) {
      serviceActions[data.serviceAction](data.message);
    }
  });
},
onReloadHandler = function() {
  console.log('on reload handle');
  UIAction('show_main');
  UIAction('reload');

  // console.log('reload');
},
onReload = function(message, port) {
  if (message.action !== 'reload') return;

  onReloadHandler();
};

var serviceActions = {
  attach: function() {
    isAttached = true;

    var wasWatched = isWatchingPage;

    requestWatchTab(function() {
      if (wasWatched) {
        frontEndCommand('attachToBackend');
      }
    }, {
      attach: !isWatchingPage
    });

    onReloadHandler();
  },
  reload_and_attach: function() {
    isAttached = true;

    requestWatchTab(function() {
      chrome.devtools.inspectedWindow.reload();
    });
  },
  open_resource: function(message) {
    if (chrome.devtools.panels.openResource) {
      chrome.devtools.panels.openResource(message.file, message.line - 1);
    }
  },
  detach: function() {
    console.log('detach');
    requestStopWatch();
    frontEndCommand('detachFromBackend');
    isAttached = false;
  }
};

port.onMessage.addListener(function(message) {
  if (message.action !== 'front_end_started') return;

  isWatchingPage = true;
});

port.postMessage({
  action: 'prepare_front_end',
  data: {
    tabId: chrome.devtools.inspectedWindow.tabId
  }
});

var isWatchingPage,
  isAttached,
  makeIsFalse = function() {
    isWatchingPage = false;
    isAttached = false;
  };

var isWatchingPagePromise = new Promise(function(resolve) {
  var WAIT_LIMIT = 5000,
    currentWait = 0;

  var doEval = function() {
    chrome.devtools.inspectedWindow.eval(
      '({ isWatchingPage: this.isWatchingPage, isAttached: this.isAttached })', {
        useContentScriptContext: true
      }, function(result, exception) {
        if (exception) {
          if (exception.isError && exception.code === 'E_NOTFOUND') {
            if (currentWait < 5000) {
              currentWait += 100;
              setTimeout(doEval, 100);
              return;
            } else {
              makeIsFalse();
            }
          } else {
            makeIsFalse();
          }
        } else if (result) {
          isAttached = result.isAttached;
          isWatchingPage = result.isWatchingPage
        } else {
          makeIsFalse();
        }

        console.log('isWatchingPage', isWatchingPage);
        console.log('isAttached', isAttached);

        resolve();
      }
    );
  };

  doEval();
});