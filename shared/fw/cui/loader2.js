(function(win) {
  var LOADER_VERSION = 'LOADER_VERSION',
    LOADER_MODULES = 'LOADER_MODULES',
    LOCAL_STORAGE = 'localStorage',
    GET_ITEM = 'getItem',
    FUNCTION = 'Function',
    DOCUMENT = 'document',
    SET_TIMEOUT = 'setTimeout',
    ADD_EVENT_LISTENER = 'addEventListner',
    REPLACE = 'replace';

  var domReady = [],
    version = +'<?= intval($version) ?>',
    deps = '<?= json_encode($files) ?>',
    url = '<?= $getter ?>',
    doc = win[DOCUMENT],
    domReadyHandler = function() {
      for (var i = 0, len = domReady.length; i < len; i++) {
        win[SET_TIMEOUT](domReady[i], 1);
      }

      domReady = 1;
    },
    cached;

  win.modules = {
    dom: function(fn) {
      if (domReady === 1) {
        win[SET_TIMEOUT](fn, 1);
      } else {
        domReady.push(fn);
      }
    },
    loader: {
      version: version,
      deps: deps,
      url: url,
      VERSION_KEY: LOADER_VERSION,
      MODULES_KEY: LOADER_MODULES
    },
    ready: function(fn) {
      modules.readyList.push(fn);
    },
    readyList: []
  };

  if (doc[ADD_EVENT_LISTENER]) {
    doc[ADD_EVENT_LISTENER]('DOMContentLoaded', domReadyHandler, !1);
  } else {
    win.attachEvent('onload', domReadyHandler);
  }

  if (cached = (win[LOCAL_STORAGE][GET_ITEM](VERSION_KEY) | 0) === version) {
    (new win[FUNCTION]([LOCAL_STORAGE][GET_ITEM](MODULES_KEY)))();
  }

  doc.write('<scr' + 'ipt src="' + url[REPLACE]('$d', deps)[REPLACE]('$c', +cached) + '" async></scr' + 'ipt>');
}(this));

modules.ready(function(mods) {
  var parser = mods.parser,
    events = mods.events;

  events.fire(document.body, parser.events.parse);
});