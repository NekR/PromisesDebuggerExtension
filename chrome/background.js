(function(global) {
  var inspections = new (global.Set || global.WeakSet),
    inspectionsMap = {},
    webNavigationWanting = false;

  var onBeforeNavigate = function(details) {
    if (details.frameId !== 0) return;

    var inspectData = inspectionsMap[details.tabId];

    if (!inspectData) return;

    attachToTarget(inspectData);

    inspectData = null;
  },
  onCommitted = function(details) {
    if (details.frameId !== 0) return;

    var inspectData = inspectionsMap[details.tabId];

    if (!inspectData) return;

    inspectData.port.postMessage({
      action: 'reload'
    });

    inspectData = null;
  };

  var startWebNavigationWatch = function() {
    webNavigationWanting = true;

    chrome.webNavigation.onBeforeNavigate.addListener(onBeforeNavigate);
    chrome.webNavigation.onCommitted.addListener(onCommitted);
  },
  stopWebNavigationWatch = function() {
    webNavigationWanting = false;

    chrome.webNavigation.onBeforeNavigate.removeListener(onBeforeNavigate);
    chrome.webNavigation.onCommitted.removeListener(onCommitted);
  },
  attachToTarget = function(inspectData, callback) {
    chrome.tabs.executeScript(inspectData.tabId, {
      code: 'var backendCode = ' + JSON.stringify(debugBackendCode) + ';' +
        'this.evalBackend && this.evalBackend(backendCode);',
      runAt: 'document_start'
    }, function() {
      
    });

    chrome.tabs.executeScript(inspectData.tabId, {
      file: 'promises-frontend.js',
      runAt: 'document_start'
    }, function() {
      if (callback) {
        callback();
      }
    });
  };

  var getDebugBackendCode = function() {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', 'shared/promises-backend.js', false);
    xhr.send();

    return xhr.response;
  };

  chrome.runtime.onConnect.addListener(function(port) {
    if (port.name !== 'DEV_TOOLS') return;

    console.log('port connect');

    var inspectData = {
      port: port
    };

    var messageListener = function(message, port) {
      if (!('tabId' in inspectData)) {
        handleTabId(message, port);
      }

      if (message.action === 'start_watch_page') {
        startWatchHandler(message, port);
      }

      if (message.action === 'stop_watch_page') {
        stopWatchHandler(message, port);
      }

      if (message.action === 'prepare_front_end') {
        prepareFrontEnd(message, port);
      }
    };

    var startWatchHandler = function(message, port) {
      if (!webNavigationWanting) {
        // first call from dev_tools
        // start watching webNavigation
        startWebNavigationWatch();
      }

      inspectData.tab.then(function() {
        if (message.data.attach) {
          attachToTarget(inspectData);
        }

        port.postMessage({
          action: 'watch_started'
        });
      });
    },
    stopWatchHandler = function(message, port) {
      if (webNavigationWanting) {
        // first call from dev_tools
        // start watching webNavigation
        stopWebNavigationWatch();
      }
    },
    prepareFrontEnd = function(message, port) {
      chrome.tabs.executeScript(inspectData.tabId, {
        code: ';(function() {}());',
        runAt: 'document_start'
      }, function() {
        
      });
    },
    handleTabId = function(message, port) {
      var handleTab = function(tab) {
        inspectData.tab = tab;
      },
      handleMap = function(id) {
        console.log('got tab id');

        inspectData.tabId = id;
        inspectionsMap[id] = inspectData;
      };

      // port.sender.id always exists
      // always self extension id?
      if (port.sender.tab) {
        // debug extension, not sure only self or not
        // message.data.tabId is undefined
        // but send.tab and port.sender.url exists
        handleMap(port.sender.tab.id);
        handleTab(Promise.resolve(port.sender.tab));
      } else if (message.data && 'tabId' in message.data) {
        // debug web page
        // tab object is not exists, only tabId in message.data
        // need to get tab object
        handleMap(message.data.tabId);

        handleTab(new Promise(function(resolve) {
          chrome.tabs.get(message.data.tabId, function(tab) {
            resolve(tab);
          });
        }));
      }
    };

    inspections.add(inspectData);
    port.onMessage.addListener(messageListener);

    port.onDisconnect.addListener(function() {
      console.log('port disconnect');
      port.onMessage.removeListener(messageListener);

      stopWatchHandler();

      if (inspectData && inspectData.tabId) {
        inspectionsMap[inspectData.tabId] = null;
      }

      inspections.delete(inspectData);
    });
  });

  chrome.runtime.onConnect.addListener(function(port) {
    if (port.name !== 'FRONT_END__TO__DEV_TOOLS') return;

    var inspectData = inspectionsMap[port.sender.tab.id];

    // console.log('BOUND TO FRONT_END', inspectData);
    if (!inspectData) return;


    inspectData.port.postMessage({
      action: 'front_end_started'
    });

    var messageListener = function(message) {
      // console.log('resend message');
      inspectData.port.postMessage({
        action: 'front_end_event',
        data: message
      });
    };

    var disconnectHandler = function() {
      port.onMessage.removeListener(messageListener);
      port.onDisconnect.removeListener(disconnectHandler);
    };

    inspectData.port.onDisconnect.addListener(function() {
      disconnectHandler();
      port.disconnect();
    });

    port.onMessage.addListener(messageListener);
    port.onDisconnect.addListener(function() {
      // console.log('FRONT_END__TO__DEV_TOOLS disconnect');
    });

    port.onDisconnect.addListener(disconnectHandler);
  });

  var debugBackendCode = getDebugBackendCode();
}(this));
