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
      loader.debug = true;
      modules.loader = loader;

      if ((win[LOCAL_STORAGE][GET_ITEM](LOADER_VERSION) | 0) === loader.version) {
        domReady[PUSH](new win[FUNCTION](win[LOCAL_STORAGE][GET_ITEM](LOADER_MODULES)));
      } else {
        var url = loader.url.replace(R_EVAL, function(input, key) {
            return (new Function(LOADER, 'with(' + LOADER + ') {(' + loader[key] + ')}'))(loader);
          });

        doc.write('<scr' + 'ipt src="' + url + '" async></scr' + 'ipt>');
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