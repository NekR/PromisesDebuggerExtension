;(function initModules(window, modules) {
  "use strict";

  if (modules.inited) return;

  if (typeof window.console === 'undefined') {
    window.console = {};

    window.console.log =
      window.console.debug =
      window.console.dir =
      window.console.inspect =
      window.console.info =
      window.console.error =
      window.console.time =
      window.console.timeEnd = function() {};
  }

  var apply = Function.prototype.apply;

  // window.debug = apply.bind(console.log, console);
  window.debug = function() {
    apply.call(console.log, console, arguments);
  };

  var setStorageItem = function(key, value) {
    if (!window.localStorage || !localStorage.setItem) {
      debug('warn: no local storage');
      return true;
    }

    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  },
  isArray = Array.isArray,
  isObj = function(val) {
    return val && !isArray(val) &&
      // bad regexp checking
      // but better than monkey checking
      typeof val === 'object' && !(val instanceof RegExp);
  };

  var list = {},
    pages = {},
    loader = modules.loader,
    hasOwn = {}.hasOwnProperty,
    caching = loader.cache !== false;

  var callReadyHandlers = function() {
    var readyList = modules.readyList;

    modules.readyList = null;
    modules.ready = call;

    readyList.forEach(call);
  },
  call = function(fn) {
    fn();
  };

  modules.loader = null;
  modules.inited = true;

  modules.load = function(loader) {
    if (!loader) return;

    var packaged = loader.packaged,
      deps = loader.deps;

    var loadPackage = function(url, loadedModules) {
      var diffDeps = caching ? deps.filter(function(key) {
        return !(hasOwn.call(loadedModules, key));
      }) : deps.concat();

      var end = function(needSave) {
        loading.forEach(function(mod) {
          modules.execute(mod);
        });

        callReadyHandlers();

        caching && needSave && setTimeout(function() {
          modules.saveModules();
        }, 0);
      };

      if (!diffDeps.length) {
        end();
        return;
      }

      var newLoader = {
        deps: diffDeps
      };

      Object.keys(loader).forEach(function(key) {
        if (key !== 'deps') {
          newLoader[key] = loader[key];
        }
      });

      url = url.replace(modules.R_EVAL, function(input, key) {
        return (new Function('loader', 'with(loader) {(' +
          newLoader[key] + ')}'))(newLoader);
      });

      var first = document.querySelector('script'),
        script = document.createElement('script');

      script.src = url;
      script.async = true;

      setTimeout(function() {
        first.parentNode.insertBefore(script, first);
      }, 1);
    };

    if (packaged) {
      modules.loadModules(function(loadedModules) {
        loadPackage(packaged, loadedModules);
      });

      return;
    }

    if (loader.optimized) {
      modules.loadModules(function(loadedModules) {
        loadPackage(loader.url, loadedModules);
      });

      return;
    }

    var splitPath = function(path) {
      var split = path.match(/(?:^|\/)([^\/]+)\.\w+?(?:\?(\d*))?$/);

      if (!split) return {};

      var name = split[1],
        version = split[2];

      if (!isFinite(version)) {
        version = void 0;
      } else {
        version = +version;
      }

      return {
        name: name,
        version: version
      };
    },
    pacakgeDeps = typeof loader.package  === 'function' ?
      loader.package : function(deps) {
        if (isArray(deps)) {
          return deps.map(function(dep) {
            if (isObj(dep)) {
              return {
                file: dep.file,
                name: dep.name,
                version: dep.version
              };
            } else {
              var split = splitPath(dep);

              return {
                file: dep,
                name: split.name,
                version: split.version
              };
            }
          });
        } else {
          return Object.keys(deps).map(function(key) {
            var dep = deps[key];

            return {
              file: key,
              name: dep.name,
              version: dep.version
            };
          });
        }
      };

    if (loader.debug) {
      (function() {
        var loading = pacakgeDeps(deps),
          first = document.querySelector('script');;

        var loadNext = function() {
          if (!loading.length) {
            callReadyHandlers();
            return;
          }

          var dep = loading.shift(),
            file = dep.file,
            script = document.createElement('script');

          script.src = (loader.path || '') + file;
          script.onload = function() {
            loadNext();
          };

          setTimeout(function() {
            first.parentNode.insertBefore(script, first);
          }, 1);
        };

        loadNext();
      }());

      return;
    }

    modules.loadModules(function(loadedModules) {
      var end = function() {
        loading.forEach(function(mod) {
          modules.execute(mod);
          modules.addModule(mod);
        });

        callReadyHandlers();

        caching && setTimeout(function() {
          modules.saveModules();
        }, 0);
      };

      var loadedLength = 0,
        hasPrending;

      var loading = pacakgeDeps(deps).map(function(dep) {
        var file = dep.file,
          name = dep.name,
          version = dep.version;

        useCache: if (caching && hasOwn.call(loadedModules, name)) {
          var loaded = loadedModules[name];

          if (loaded.version != version) {
            delete loadedModules[name];
            break useCache;
          }

          return loaded;
        }

        var xhr = new XMLHttpRequest(),
          mod = {
            name: name,
            version: version
          };

        if (!hasPrending) {
          hasPrending = true;
        }

        xhr.open('GET', (loader.path || '') + file, true);
        xhr.overrideMimeType('text/plain; charset="utf-8"');
        xhr.responseType = 'text';

        xhr.onload = function() {
          mod.code = this.responseText;

          if (++loadedLength >= loading.length) {
            end();
          }
        };

        setTimeout(function() {
          xhr.send();
        }, 1);

        return mod;
      });

      if (!hasPrending) {
        end();
      }
    });
  };

  var extend = {
    packagedCallback: function(mods) {
      var end = function() {
        callReadyHandlers();

        setTimeout(function() {
          modules.saveModules();
        }, 0);
      };

      if (!isArray(mods)) {
        end();
        return;
      }

      mods.forEach(function(mod) {
        modules.execute(mod);
        modules.addModule(mod);
      });

      end();
    },
    handleModule: function(name, module) {
      list[name] = module;

      var exports = module.exports;

      if (exports &&
        typeof exports === 'object' ||
        typeof exports === 'function'
      ) {
        Object.defineProperty &&
        Object.defineProperty(exports, '__moduleName__', {
          writable: false,
          configurable: false,
          enumerable: false,
          value: name
        });
      }

      // Object.freeze && Object.freeze(exports);

      return module;
    },
    require: function(name) {
      if (typeof name !== 'string') throw new TypeError('Bad argument');
      return hasOwn.call(list, name) ? list[name].exports : null;
    },
    define: function(name, fn, version) {
      if (typeof name !== 'string' || typeof fn !== 'function') return;

      var module = Object.create(null, {
        name: {
          get: function() {
            return name;
          }
        },
        version: {
          get: function() {
            return version
          }
        },
        exports: (function() {
          var exports = {};

          return {
            get: function() {
              return exports;
            },
            set: function(val) {
              exports = val;
            }
          }
        }())
      }),
      exports = module.exports;

      modules.push(module);

      var result = fn.call(
        window,
        modules.require,
        modules,
        module,
        exports
      );

      if (module.exports === exports &&
        typeof result !== 'undefined' && result !== exports
      ) {
        module.exports = result;
      }

      exports = null;

      modules.handleModule(name, module);
      modules.pop();

      return module;
    },
    getList: function() {
      return list;
    },
    execute: function(mod) {
      var name = mod && mod.name,
        code = mod && mod.code,
        version = mod && mod.version;

      if (!mod || !code || hasOwn.call(list, mod.name)) {
        return false;
      }
      
      var args = [
        'require',
        'modules',
        'module',
        'exports'
      ].join(','),
      code = [
        '"use strict";',
        modules.evalGlobalRequire(),
        code,
        ';\rreturn exports;'
      ].join('');

      if (modules.evalScriptTag) {
        var script = document.createElement('script'),
          body = [
            '(function() {',
              'var fn = function(' + args + ') {' + code + '};',
              'modules.define("' + mod.name + '", fn, ' + version + ');',
            '}());'
          ].join('');

        script.textContent = body;
        document.head.appendChild(script);
      } else {
        var fn = new Function(args, code);
        modules.define(mod.name, fn, version);
      }

      return true;
    },
    getModule: function(name) {
      return hasOwn.call(list, name) ? list[name] : null;
    },
    addModule: function(mod, callback) {
      modules.loadModules(function(loadedModules) {
        if (!hasOwn.call(loadedModules, mod.name)) {
          loadedModules[mod.name] = mod;
        }

        if (callback) {
          callback();
        }
      });
    },
    loadModules: function(callback) {
      var loadedModules = modules.loadedModules;

      if (loadedModules) {
        callback(loadedModules);
        return;
      }

      var error = function() {
        callback(modules.loadedModules = {});
      };

      storage.get(modules.STORAGE_VERSION_KEY, function(version) {
        if (+loader.version !== +version) {
          storage.remove(modules.STORAGE_VERSION_KEY);
          storage.remove(modules.STORAGE_CODE_KEY);
          error();
          return;
        }

        storage.get(modules.STORAGE_CODE_KEY, function(mods) {
          if (isObj(mods)) {
            modules.loadedModules = mods;
            callback(mods);
          } else {
            error();
          }
        }, error);
      }, error);
    },
    saveModules: function(callback, errback) {
      storage.set(modules.STORAGE_VERSION_KEY, loader.version);

      storage.set(
        modules.STORAGE_CODE_KEY,
        modules.loadedModules,
        callback,
        errback
      );
    },
    push: function(mod) {
      this.stack.push(mod);
    },
    pop: function() {
      this.stack.pop();
    },
    clearCache: function() {
      localStorage.removeItem(modules.LOADER_MODULES);
      localStorage.removeItem(modules.LOADER_VERSION);
      storage.remove(modules.STORAGE_VERSION_KEY);
      storage.remove(modules.STORAGE_CODE_KEY);
    },
    useGlobals: function() {
      var global = modules.globalRequire,
        keys = Object.keys(global);

      if (keys.length) {
        keys.forEach(function(key) {
          if (modules.globalsUsed[key]) return;
          modules.globalsUsed[key] = window[key] = modules.require(global[key]);
        });
      }
    },
    evalGlobalRequire: function() {
      var global = modules.globalRequire,
        keys = Object.keys(global),
        code = ';';

      if (keys.length) {
        keys.forEach(function(key) {
          code += 'var ' + key + ' = require("' + global[key] + '");';
        });
      }

      return code;
    },

    stack: [],
    globalsUsed: {},
    globalRequire: {},
    loadedModules: null,
    STORAGE_CODE_KEY: '_storage_modules_code_',
    STORAGE_VERSION_KEY: '_storage_modules_version_',

    get current() {
      var stack = this.stack,
        length = stack.length;

      return length ? stack[length - 1] : null;
    }
  };

  for (var prop in extend) {
    if (hasOwn.call(extend, prop)) {
      modules[prop] = extend[prop];
    }
  }

  var source = 'modules.fromCache = true; (' + initModules + '(this, modules))';

  caching && setTimeout(function() {
    setStorageItem(modules.LOADER_MODULES, source);
    setStorageItem(modules.LOADER_VERSION, loader.version);
  });

  modules.define('_storage', defineStorage);
  var storage = modules.require('_storage');

  if (loader.optimized) {
    window[modules.PACKAGED_CALLBACK] = function(mods) {
      window[modules.PACKAGED_CALLBACK] = null;
      modules.packagedCallback(mods);
    };
  }

  if (loader && !loader.optimized || modules.fromCache) {
    modules.load(loader);
  }

  // Code from LocalForge library
  // https://github.com/mozilla/localForage/blob/master/LICENSE
  // Copyright 2014 Mozilla
  // Licensed under the Apache License, Version 2.0

  function defineStorage(require, modules, module, exports) {
    // Initialize IndexedDB; fall back to vendor-prefixed versions if needed.
    var indexedDB = window.indexedDB || window.webkitIndexedDB ||
                    window.mozIndexedDB || window.msIndexedDB;

    module.exports = indexedDB ? initIDBStorage(indexedDB) : initLocalStorage();
  }

  function initIDBStorage(indexedDB) {
    // Originally found in https://github.com/mozilla-b2g/gaia/blob/e8f624e4cc9ea945727278039b3bc9bcb9f8667a/shared/js/async_storage.js

    var db = null,
      exports = {};

    var DBNAME = '_mod_storage_',
      DBVERSION = 1,
      STORENAME = 'keyvaluepairs';

    function withStore(type, f, reject) {
      if (db) {
        f(db.transaction(STORENAME, type).objectStore(STORENAME));
      } else {
        var openreq = indexedDB.open(DBNAME, DBVERSION);

        if (reject) {
          openreq.onerror = function withStoreOnError() {
            reject(openreq.error);
          };
        }

        openreq.onupgradeneeded = function withStoreOnUpgradeNeeded() {
          // First time setup: create an empty object store
          openreq.result.createObjectStore(STORENAME);
        };

        openreq.onsuccess = function withStoreOnSuccess() {
          db = openreq.result;
          f(db.transaction(STORENAME, type).objectStore(STORENAME));
        };
      }
    }

    function getItem(key, callback, errback) {
      withStore('readonly', function getItemBody(store) {
        var req = store.get(key);

        req.onsuccess = function getItemOnSuccess() {
          var value = req.result;

          if (value === undefined) {
              value = null;
          }

          if (callback) {
            callback(value);
          }
        };

        if (errback) {
          req.onerror = function getItemOnError() {
            errback(req.error);
          };
        }
      }, errback);
    }

    function setItem(key, value, callback, errback) {
      withStore('readwrite', function setItemBody(store) {
        // Cast to undefined so the value passed to callback/promise is
        // the same as what one would get out of `getItem()` later.
        // This leads to some weirdness (setItem('foo', undefined) will
        // return "null"), but it's not my fault localStorage is our
        // baseline and that it's weird.
        if (value === undefined) {
          value = null;
        }

        var req = store.put(value, key);

        req.onsuccess = function setItemOnSuccess() {
          if (callback) {
            callback(value);
          }
        };

        if (errback) {
          req.onerror = function setItemOnError() {
            errback(req.error);
          };
        }
      }, errback);
    }

    function removeItem(key, callback, errback) {
      withStore('readwrite', function removeItemBody(store) {
        var req = store.delete(key);

        req.onsuccess = function removeItemOnSuccess() {
          if (callback) {
            callback();
          }
        };

        if (errback) {
          req.onerror = function removeItemOnError() {
            errback(req.error);
          };
        }
      });
    }

    return {
      get: getItem,
      set: setItem,
      remove: removeItem
    };
  }

  function initLocalStorage() {
    var localStorage = null,
      exports = {};

    // If the app is running inside a Google Chrome packaged webapp, or some
    // other context where localStorage isn't available, we don't use
    // localStorage. This feature detection is preferred over the old
    // `if (window.chrome && window.chrome.runtime)` code.
    // See: https://github.com/mozilla/localForage/issues/68
    try {
        // Initialize localStorage and create a variable to use throughout
        // the code.
        localStorage = window.localStorage;
    } catch (e) {
      var noop = function() {};
      return {
        get: noop,
        set: noop,
        remove: noop
      };
    }

    // Retrieve an item from the store. Unlike the original async_storage
    // library in Gaia, we don't modify return values at all. If a key's value
    // is `undefined`, we pass that value to the callback function.
    function getItem(key, callback, errback) {
      try {
        var result = localStorage.getItem(key);

        // If a result was found, parse it from serialized JSON into a
        // JS object. If result isn't truthy, the key is likely
        // undefined and we'll pass it straight to the callback.
        if (result) {
          result = JSON.parse(result);
        }
      } catch (e) {
        errback(e);
        return;
      }

      if (callback) {
        callback(result);
      }
    }

    // Remove an item from the store, nice and simple.
    function removeItem(key, callback) {
      localStorage.removeItem(key);

      if (callback) {
        callback();
      }
    }

    // Set a key's value and run an optional callback once the value is set.
    // Unlike Gaia's implementation, the callback function is passed the value,
    // in case you want to operate on that value only after you're sure it
    // saved, or something like that.
    function setItem(key, value, callback, errback) {
      // Convert undefined values to null.
      // https://github.com/mozilla/localForage/pull/42
      if (value === undefined) {
        value = null;
      }

      // Save the original value to pass to the callback.
      var originalValue = value;

      try {
        value = JSON.stringify(value);
      } catch (e) {
        errback(e);
      }

      localStorage.setItem(key, value);

      if (callback) {
        callback(originalValue);
      }
    }

    return {
      get: getItem,
      set: setItem,
      remove: removeItem
    };
  }
}(this, modules));