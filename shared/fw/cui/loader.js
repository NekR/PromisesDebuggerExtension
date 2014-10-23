(function(win) {
  var LOADER_VERSION = 'LOADER_VERSION',
    LOADER_MODULES = 'LOADER_MODULES',
    LOCAL_STORAGE = 'localStorage',
    GET_ITEM = 'getItem',
    FUNCTION = 'Function',
    DOCUMENT = 'document',
    SET_TIMEOUT = 'setTimeout',
    ASYNC = 'async',
    PUSH = 'push',
    SCRIPT_TAG = 'script',
    LOADER = 'loader',
    R_EVAL = /\$\{([^\=\&^\}]*?)\}/gi;

  var domReady = [],
    doc = win[DOCUMENT],
    domReadyHandler = function() {
      for (var i = 0, len = domReady.length; i < len; i++) {
        win[SET_TIMEOUT](domReady[i], 1);
      }

      domReady = 1;
    };

  var modules = win.modules = {
    dom: function(fn) {
      if (domReady === 1) {
        win[SET_TIMEOUT](fn, 1);
      } else {
        domReady[PUSH](fn);
      }
    },
    ready: function(fn) {
      modules.readyList[PUSH](fn);
    },
    load: function(loader) {
      var script = doc.createElement(SCRIPT_TAG),
        first = doc.querySelector(SCRIPT_TAG),
        insert = function() {
          first.parentNode.insertBefore(script, first);
        };

      modules.loader = loader;

      if ((win[LOCAL_STORAGE][GET_ITEM](LOADER_VERSION) | 0) === loader.version) {
        domReady[PUSH](new win[FUNCTION](win[LOCAL_STORAGE][GET_ITEM](LOADER_MODULES)));
      } else {
        script.src = loader.url.replace(R_EVAL, function(input, key) {
            return (new Function(LOADER, 'with(' + LOADER + ') {(' + loader[key] + ')}'))(loader);
          });

        if (ASYNC in script) {
          script[ASYNC] = !0;
          insert();
        } else {
          domReady[PUSH](insert);
        }
      }
    },
    readyList: [],
    LOADER_VERSION: LOADER_VERSION,
    LOADER_MODULES: LOADER_MODULES,
    PACKAGED_CALLBACK: '_PCB' + +(new Date), // Packaged CallBack
    R_EVAL: R_EVAL
  };

  doc.addEventListener('DOMContentLoaded', domReadyHandler, !1);
}(this));

/*modules.load({
  version: 1,
  url: '/modules.js?deps=${deps}&v=${version}&init=${!modules.inited}&callback=${modules.PACKAGED_CALLBACK}'
});*/