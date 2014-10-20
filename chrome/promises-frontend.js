(function(global) {
  console.log('inject isWatchingPage:', global.isWatchingPage);

  if (global.isWatchingPage) return;
  global.isWatchingPage = true;

  var port,
    messageBuffer = [];

  var onDisconnect = function() {
    window.removeEventListener('message', backendListener);
    port = null;
    messageBuffer = [];
    global.isAttached = false;
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

  global.getCurrentPromises = function() {
    port.postMessage({
      action: 'current_promises',
      data: {
        blah: 124
      }
    });
  };

  var backendListener = function(e) {
    if (e.source !== window) {
      console.warn('bad source');
      return;
    }

    var data = e.data;

    if (data && data.PromisesDebugger) {
      // console.log('PromisesDebugger:UpdateData');

      var message = {
        action: 'update_data',
        data: data.message
      };

      /*if (data.message.event === 'value') {
        console.log(data.message.data.value);
      }*/


      if (port) {
        port.postMessage(message);
      } else {
        messageBuffer.push(message);
      }
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

  (function() {
    console.log("hello from injected code");


    if (typeof backendCode !== 'undefined') {
      global.evalBackend(backendCode);
    }
  }());
}(this));

