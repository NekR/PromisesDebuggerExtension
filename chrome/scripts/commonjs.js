(function(global) {
  var modules = new Map();

  var LIB_URL = chrome.runtime.getURL('/scripts/');
  var SHARED_URL = chrome.runtime.getURL('/shared/ext_modules/');

  var loadModule = function(path) {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', path, false);
    xhr.send();

    try {
      var response = xhr.response;
    } catch (e) {}

    if (!response) return;

    var module = {
      exports: {},
      name: path
    };

    var fn = new Function('module', 'exports', response);
    fn(module, module.exports);

    return module;
  };

  global.require = function(path) {
    path = path.replace(/(?:\.js)?$/i, '.js');

    if (!path.indexOf('chrome-extension://')) {
      // do nothing
    } else if (!path.indexOf('shared/')) {
      path = SHARED_URL + path.replace('shared/', '');
    } else if (!path.indexOf('lib/')) {
      path = LIB_URL + path.replace('lib/', '');
    } else if (path[0] === '.' || path[0] === '/') {
      path = chrome.runtime.getURL(path);
    } else {
      // relative
      path = LIB_URL + path;
    }

    if (!path) return null;

    if (modules.has(path)) {
      return modules.get(path).exports;
    }

    var module = loadModule(path);

    if (!module) return null;

    console.log('[require]:', path);
    modules.set(path, module);

    return module.exports;
  };
}(this));