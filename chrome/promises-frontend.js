;(function(global) {
  console.log('inject isWatchingPage:', global.isWatchingPage);

  if (global.isWatchingPage) return;
  global.isWatchingPage = true;

  var port,
    messageBuffer = [],
    isChrome = true;

  var onDisconnect = function() {
    window.removeEventListener('message', backendListener);
    port = null;
    messageBuffer = [];
    global.isAttached = false;
  };

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

  global.registerDevToolsListeners = function(name) {
    console.log('registerDevToolsListeners:', name);

    if (port) return;

    port = chrome.runtime.connect({
      name: name
    });

    global.isAttached = true;

    port.onDisconnect.addListener(onDisconnect);

    if (messageBuffer.length) {
      messageBuffer.forEach(function(message) {
        // console.log('resend messages');
        port.postMessage(message);
      });

      messageBuffer = null;
    }

    console.log(port);
  };

  var backendListener = function(e) {
    if (e.source !== window) {
      console.warn('bad source');
      return;
    }

    var data = e.data;

    if (!data || !data.PromisesDebugger) return;

    if (data.method === 'requestUpdate') {
      var message = {
        action: 'update_data',
        data: data.message
      };


      if (port) {
        port.postMessage(message);
      } else {
        messageBuffer.push(message);
      }
    } else if (data.method === 'reportError') {
      global.reportError(data.message);
    }
  };

  global.attachToBackend = function() {
    global.registerDevToolsListeners('FRONT_END__TO__DEV_TOOLS');
    window.addEventListener('message', backendListener);
  };

  global.detachFromBackend = function() {
    if (port) {
      port.disconnect();
    }

    onDisconnect();
  };

  global.attachToBackend();
  global.evalBackend = function(code) {
    var script = document.createElement('script');

    script.textContent = code;
    document.documentElement.appendChild(script);
    document.documentElement.removeChild(script);
  };

  global.reportError = function(message) {
    var error = message.error,
      provider = message.provider || '';

    if (!error || !error.value) return;

    var value = error.value,
      message,
      stack;

    message = (value.name ? value.name + ': ' : '') + value.message;
    stack = value.stack ? handleEverStack(value.stack) : null;

    var showProvider = false;

    console.groupCollapsed(
      '%cPromise reject:' + (showProvider ? '[' + provider + ']:' : '') + ' ' + ((stack && stack.message) || message || '<no message>'),
      'color: red;'
    );

    if (stack && stack.lines.length) {
      stack.lines.forEach(function(line) {
        console.log('%c' + line.trim(), 'color: red;');
      });
    } else {
      console.log('%c<no stack>', 'color: red;')
    }

    console.groupEnd();
  };

  (function() {
    console.log("hello from injected code");


    if (typeof backendCode !== 'undefined') {
      global.evalBackend(backendCode);
    }
  }());
}(this));