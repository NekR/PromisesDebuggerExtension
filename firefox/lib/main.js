const { Cc, Ci, Cu, Cr } = require("chrome");
const self = require("sdk/self");
  
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
const { DevToolsUtils } = Cu.import("resource://gre/modules/devtools/DevToolsUtils.jsm", {});
const devtools = Cu.import("resource://gre/modules/devtools/Loader.jsm", {}).devtools;

const events = require("sdk/event/core");
const { on, once, off, emit } = events;
const { setTimeout, clearTimeout } = require('sdk/timers');
const { readURI, readURISync } = require('sdk/net/url');


console.log('Start');

var getDesc = Object.getOwnPropertyDescriptor;

var log = {
  prefix: '[PromisesDebugger]:',
  warn: function(...args) {
    args.unshift(this.prefix);
    console.warn(...args);
  }
};

var buildProgressQI = function(obj) {
  // obj.QueryInterface = XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),
  obj.QueryInterface = function(aIID) {
    if (
      aIID.equals(Ci.nsIWebProgressListener) ||
      aIID.equals(Ci.nsISupportsWeakReference) ||
      aIID.equals(Ci.nsIXULBrowserWindow) ||
      aIID.equals(Ci.nsISupports)
    ) {
      return this;
    }

    throw Cr.NS_NOINTERFACE;
  }

  return obj;
};

var buildProgressListener = function(obj, methods) {
  var listener = buildProgressQI({});

  Object.keys(methods).forEach((key) => {
    listener[key] = methods[key].bind(obj);
  });

  return listener;
};

let promisesBackendCode;
let promisesProvidersCode = '';
let providers = [
  'es6'
];

providers.forEach(function(provider) {
  var code = readURISync(self.data.url('shared/providers/' + provider + '.js'));

  promisesProvidersCode += ';(function(PromisesDebugger, global) {' +
    code + '}(PromisesDebugger, this));';
});

readURI(self.data.url('shared/promises-backend.js'))
  .then(function(code) {
    promisesBackendCode = code + promisesProvidersCode;
  });

const XHTML_NS = "http://www.w3.org/1999/xhtml";
const isChrome = false;

var handleEverStack = function(stack) {
  var lines = stack.split(/(?:\n+|\->)/),
    line,
    i = 0,
    newLines = [],
    firstLine = lines[0],
    message;

  if (isChrome && firstLine &&
    firstLine.search(/\bat\b/) === -1 && firstLine.search(/error/i) !== -1) {
    message = firstLine;
    lines = lines.slice(1);
  }

  if (true) {
    while (i < lines.length) {
      line = lines[i];
      ++i;

      if (
        line && (
          line.indexOf('(native)') !== -1 ||
          line.indexOf('(<anonymous>:') !== -1 ||
          line.indexOf('resource://') !== -1 ||
          line.indexOf('jar:file://') !== -1
        )
      ) {
        continue;
      }

      if (line) {
        newLines.push(line);
      }
    }
  } else {
    newLines = lines;
  }

  if (!newLines.length) {
    return null;
  }

  return {
    lines: newLines,
    message: message
  };
};

var makeMessage = function(document, data) {
  let value = data.error.value;
  let provider = data.provider;
  let name = value.name;
  let title = 'Promise reject: ' + (name ? name + ': ' : '') +
    (value.message || '<no message>');

  let messageNode = document.createElementNS(XHTML_NS, 'div');

  messageNode.style.display = 'block';
  messageNode.style.color = '#CD2929';

  let groupTitle = makeGroupTitle(document, title);
  messageNode.appendChild(groupTitle);

  let groupContainer = makeGroupContainer(document);
  messageNode.appendChild(groupContainer);

  groupTitle.addEventListener('click', function() {
    groupContainer.hidden = !groupContainer.hidden;

    var display = groupTitle.cornerOpened.style.display === 'inline-block' ?
      'none' : 'inline-block';

    groupTitle.cornerClosed.style.display =
      (groupTitle.cornerOpened.style.display = display) === 'inline-block' ?
        'none' : 'inline-block';
  });

  let stack = value.stack ? handleEverStack(value.stack) : null;

  if (stack && stack.lines.length) {
    stack.lines.forEach(function(line) {
      let lineNode = makeLogItem(document, line);

      groupContainer.appendChild(lineNode);
    });
  } else {
    let lineNode = makeLogItem(document, '<no stack>');
    
    groupContainer.appendChild(lineNode);
  }

  return messageNode;
},
makeGroupTitle = function(document, title) {
  let groupTitle = document.createElementNS(XHTML_NS, 'div');

  // groupTitle.style.position = 'relative';
  groupTitle.style.cursor = 'pointer';

  let cornerClosed = document.createElementNS(XHTML_NS, 'span');

  cornerClosed.style.display = 'inline-block';
  cornerClosed.style.width = 0;
  cornerClosed.style.height = 0;
  cornerClosed.style.borderTop = '4px solid transparent'
  cornerClosed.style.borderBottom = '4px solid transparent'
  cornerClosed.style.borderLeft = '6px solid #777';
  cornerClosed.style.verticalAlign = 'middle';
  cornerClosed.style.margin = '0 10px 0 0';

  groupTitle.appendChild(cornerClosed);

  let cornerOpened = document.createElementNS(XHTML_NS, 'span');

  cornerOpened.style.display = 'none';
  cornerOpened.style.width = 0;
  cornerOpened.style.height = 0;
  cornerOpened.style.borderLeft = '4px solid transparent'
  cornerOpened.style.borderRight = '4px solid transparent'
  cornerOpened.style.borderTop = '6px solid #777';
  cornerOpened.style.verticalAlign = 'middle';
  cornerOpened.style.margin = '1px 8px 1px 0';

  groupTitle.appendChild(cornerOpened);

  groupTitle.cornerOpened = cornerOpened;
  groupTitle.cornerClosed = cornerClosed;

  let text = document.createElementNS(XHTML_NS, 'span');

  text.textContent = title;
  text.style.fontWeight = 'bold';
  text.style.verticalAlign = 'middle';

  groupTitle.appendChild(text);

  return groupTitle;
},
makeGroupContainer = function(document) {
  let groupContainer = document.createElementNS(XHTML_NS, 'div');

  groupContainer.hidden = true;
  groupContainer.style.margin = '5px 0 5px 15px';
  groupContainer.style.paddingLeft = '14px';
  groupContainer.style.borderLeft = '1px solid #777';

  return groupContainer;
},
makeLogItem = function(document, text) {
  let logItem = document.createElementNS(XHTML_NS, 'div');

  logItem.textContent = text;
  logItem.style.margin = '5px 0';

  return logItem;
};

var PromisesPanel = function(window, toolbox) {
  this.toolbox = toolbox;
  this.panelWindow = window;
  this.target = toolbox.target;
  this.webProgress = this.target.tab.linkedBrowser.webProgress;
  // this.inspectedWindow = this.webProgress.DOMWindow;


  this.waitUICommands();

  if (this.isDebuggerAttached()) {
    this.UIAction('show_not_attached');
  } else {
    this.waitAttachRequest();
  }

  if (!this.target.isLocalTab) {
    this.toolbox.loadTool('jsdebugger');
    this.toolbox.loadTool('webconsole');
  }
};

PromisesPanel.prototype = {
  get inspectedWindow() {
    return this.webProgress.DOMWindow;
  },
  isDebuggerAttached: function() {
    return !!this.inspectedWindow.__PromisesDebuggerAttached__;
  },
  attachToTarget: function() {
    if (this.isDebuggerAttached()) return;

    var inspectedWindow = this.inspectedWindow;

    inspectedWindow.__PromisesDebuggerAttached__ = true;

    // here promisesBackendCode must be present
    // if it's possible need to 'then' promise and add
    // destroy handle to toolbox
    if (!promisesBackendCode) {
      log.warn('<promisesBackendCode> is not present');
      return;
    }

    if (this.target.isLocalTab) {
      inspectedWindow.eval(promisesBackendCode);
    } else {
      this.toolbox.loadTool('jsdebugger').then((Debugger) => {
        var DebuggerController = Debugger._controller;

        var doEval = () => {
          this.toolbox.loadTool('webconsole').then(function(WebConsole) {
            WebConsole.hud.jsterm.requestEvaluation(promisesBackendCode).then(function() {
              console.log('zzz', arguments);
              DebuggerController.activeThread.resume(function() {
                console.log('resume', arguments);
              });
            }, function() {
              console.log('xxx', arguments);
            });
          });
        };

        if (DebuggerController.activeThread.state === 'paused') {
          doEval();
        } else {
          DebuggerController.activeThread.interrupt(function(res) {
            console.log('interrupt:', res);

            doEval()
          });
        }
      });
    }
  },
  startWaitReloads: function() {
    if (!this.target.isLocalTab) {
      this.target.on('will-navigate', () => {
        this.onReload();
      });

      return;
    }

    let webProgress = this.webProgress;

    // not really need buildListener with arrow functions
    this.progressListener = buildProgressListener(this, {
      onLocationChange: (aWebProgress, aRequest, aLocationURI, aFlags) => {
        if (aFlags & Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT |
            aFlags & Ci.nsIWebProgressListener.LOCATION_CHANGE_ERROR_PAGE) {
          return;
        }

        this.onReload()
      }
    });
    
    webProgress.addProgressListener(
      this.progressListener,
      webProgress.NOTIFY_STATE_WINDOW | webProgress.NOTIFY_LOCATION
    );
  },
  stopWaitReloads: function() {
    let webProgress = this.webProgress;

    if (this.progressListener) {
      webProgress.removeProgressListener(this.progressListener);
      this.progressListener = null;
    }
  },
  startWatchBackend: function() {
    this.backendWatchListener = (e) => {
      var data = e.data;

      if (!data || !data.PromisesDebugger) return;

      if (data.method === 'requestUpdate') {
        // console.log('PromisesDebugger:UpdateData');

        this.UIAction('update_data', data.message);
      } else if (data.method === 'reportError') {
        this.reportError(data.message);
      }
    };

    this.inspectedWindow.addEventListener('message', this.backendWatchListener);
  },
  stopWatchBackend: function() {
    this.inspectedWindow.removeEventListener('message', this.backendWatchListener);
  },
  UIAction: function(action, message) {
    this.panelWindow.postMessage({
      action: action,
      message: message
    }, '*');
  },
  waitAttachRequest: function() {
    // XXX change to show_need_attach
    this.UIAction('show_need_reload');
  },
  waitUICommands: function() {
    var serviceActions = {
      attach: () => {
        this.startWaitReloads();

        this.onReload();
      },
      reload_and_attach: () => {
        this.startWaitReloads();

        this.inspectedWindow.location.reload();
      },
      open_resource: (message) => {
        var toolbox = this.toolbox;
        const WAIT_LIMIT = 5000;

        toolbox.selectTool('jsdebugger').then(function(Debugger) {
          let perform = () => {
            let DebuggerView = Debugger._view;
            let waiting = 0;

            if (DebuggerView.Sources.containsValue(message.file)) {
              DebuggerView.setEditorLocation(message.file, +message.line, {
                align: 'center',
                charOffset: +message.col
              });
            } else if (waiting < WAIT_LIMIT) {
              waiting += 70;
              setTimeout(perform, 70);
            }
          };

          if (Debugger.isReady) {
            perform();
          } else {
            toolbox.on('jsdebugger-ready', perform);
          }
        });
      },
      detach: () => {
        this.stopWaitReloads();
        this.stopWatchBackend();
      }
    };

    this.panelWindow.addEventListener('message', function(e) {
      var data = e.data;

      // console.log('got service action', data);

      if (data && data.serviceAction &&
        serviceActions.hasOwnProperty(data.serviceAction)
      ) {
        serviceActions[data.serviceAction](data.message);
      }
    });
  },
  reportError: function(data) {
    this.toolbox.loadTool('webconsole').then(WebConsolePanel => {
      let ui = WebConsolePanel.hud.ui;
      let message = makeMessage(ui.document, data);

      message = ui.createMessageNode(3, 0, message, '', 0, '');
      ui.outputMessage(3, message);
    });
  },

  onReload: function() {
    this.UIAction('show_main');
    this.UIAction('reload');

    this.attachToTarget();
    this.startWatchBackend();
  },

  get target() {
    return this.toolbox.target;
  },
  destroy: function() {
    this.stopWaitReloads();
    this.stopWatchBackend();
  }
};

//  DebuggerView.setEditorLocation(where.url, where.line);
// selectFrame: function(aDepth) {
// DebuggerView.updateEditor
// Debugger._view.setEditorLocation();

gDevTools.on('promises-destroy', function() {
  console.log('promises-destroy');
});


gDevTools.registerTool({
  id: 'promises',
  url: self.data.url('shared/promises-panel.html'),
  label: 'Promises',
  tooltip: 'Promises Debugger',
  icon: self.data.url("icon-16.png"),
  isTargetSupported: target => target.isLocalTab,
  build: (window, toolbox) => {
    toolbox.on('destroy', function() {
      console.log('toolbox destroy');
    });

    return new PromisesPanel(window, toolbox);
  }
});

// toolbox target.client and target.from for Front cunstructors

// front for actor

// victorporof 